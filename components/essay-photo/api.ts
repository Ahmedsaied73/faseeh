import { API_BASE_URL } from '@/lib/api-client';
import { ApiError, AuthError } from '@/lib/errors';

export interface ExtractEssayPhotoParams {
  file: File | Blob;
  attemptId: number;
  questionId: string;
  signal?: AbortSignal;
}

export interface ExtractEssayPhotoResult {
  extractionId: string;
  text: string;
  unreadableCount: number;
  imageQuality: string;
  detectedLanguage: string;
  warnings: string[];
  remainingExamAttempts: number;
  cached: boolean;
}

export class EssayPhotoError extends ApiError {
  public readonly code?: string;
  public readonly fallbackToKeyboard: boolean;

  constructor(
    message: string,
    status: number,
    code?: string,
    body?: unknown,
    fallbackToKeyboard = false,
  ) {
    super(message, status, body);
    this.name = 'EssayPhotoError';
    this.code = code;
    this.fallbackToKeyboard = fallbackToKeyboard;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

let _pendingRefresh: Promise<boolean> | null = null;

async function attemptSilentRefresh(): Promise<boolean> {
  if (
    typeof document !== 'undefined' &&
    !document.cookie.split(';').some((c) => c.trim() === 'isLoggedIn=true')
  ) {
    return false;
  }
  if (_pendingRefresh) return _pendingRefresh;

  _pendingRefresh = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    _pendingRefresh = null;
  });

  return _pendingRefresh;
}

function mapErrorMessage(status: number, serverMsg?: string): { message: string; fallbackToKeyboard: boolean } {
  switch (status) {
    case 400:
      return {
        message: serverMsg || 'الصورة غير صالحة أو حجمها كبير جداً (الحد الأقصى 4 ميجابايت).',
        fallbackToKeyboard: false,
      };
    case 403:
      return {
        message: serverMsg || 'خدمة تصوير الحل غير متاحة لهذا الاختبار.',
        fallbackToKeyboard: true,
      };
    case 422:
      return {
        message: serverMsg || 'تعذر قراءة الصورة، تأكد من وضوح الخط والإضاءة أو اكتب بالكيبورد.',
        fallbackToKeyboard: false,
      };
    case 429:
      return {
        message: 'تم استهلاك الحد المسموح لتصوير الحل. يمكنك المتابعة بالكتابة بالكيبورد.',
        fallbackToKeyboard: true,
      };
    case 503:
      return {
        message: 'خدمة التصوير متوقفة مؤقتاً. يمكنك المتابعة بالكتابة بالكيبورد.',
        fallbackToKeyboard: true,
      };
    case 504:
      return {
        message: 'استغرق استخراج النص وقتاً طويلاً. يمكنك المحاولة مرة أخرى أو الكتابة بالكيبورد.',
        fallbackToKeyboard: true,
      };
    default:
      return {
        message: serverMsg || `حدث خطأ غير متوقع أثناء استخراج النص (${status}).`,
        fallbackToKeyboard: true,
      };
  }
}

async function sendExtractRequest(
  params: ExtractEssayPhotoParams,
  isRetry = false,
): Promise<ExtractEssayPhotoResult> {
  const { file, attemptId, questionId, signal } = params;
  const formData = new FormData();
  formData.append('image', file, file instanceof File ? file.name : 'solution.jpg');
  formData.append('attemptId', String(attemptId));
  formData.append('questionId', questionId);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/essay-photo/extract`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal,
      cache: 'no-store',
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new EssayPhotoError(
      'تعذر الاتصال بالخادم. يمكنك المتابعة بالكتابة بالكيبورد.',
      0,
      'NETWORK_ERROR',
      undefined,
      true,
    );
  }

  if (response.status === 401) {
    if (!isRetry) {
      const refreshed = await attemptSilentRefresh();
      if (refreshed) {
        return sendExtractRequest(params, true);
      }
    }
    throw new AuthError('انتهت جلستك، يرجى تسجيل الدخول مرة أخرى.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const parsed = body as {
    success?: boolean;
    data?: ExtractEssayPhotoResult;
    error?: string;
    message?: string;
    code?: string;
  } | null;

  if (!response.ok || !parsed?.success || !parsed.data) {
    const serverMsg = parsed?.error || parsed?.message;
    const mapped = mapErrorMessage(response.status, serverMsg);
    throw new EssayPhotoError(
      mapped.message,
      response.status,
      parsed?.code,
      body,
      mapped.fallbackToKeyboard,
    );
  }

  return parsed.data;
}

export async function extractEssayPhoto(
  params: ExtractEssayPhotoParams,
): Promise<ExtractEssayPhotoResult> {
  return sendExtractRequest(params, false);
}
