"use client";

import React, { createElement } from "react";
import { ElementFactory, Question, Serializer } from "survey-core";
import { ReactQuestionFactory, SurveyQuestionElementBase } from "survey-react-ui";
import { RichEditor } from "../RichEditor";
import { RichView } from "../RichView";
import { isEmptyRich } from "@/lib/richContent";
import { subjectProfile } from "@/lib/subjectProfile";

export const RICH_ANSWER_TYPE = "richanswer"; // SurveyJS custom question type (lowercase)

export class QuestionRichAnswerModel extends Question {
  override getType() {
    return RICH_ANSWER_TYPE;
  }

  // Required question validation: empty blocks do not satisfy requirement
  override isEmpty() {
    const val = this.value;
    if (val === undefined || val === null || val === "") return true;
    if (typeof val === "string" && isEmptyRich(val)) return true;
    return false;
  }
}

export class SurveyQuestionRichAnswer extends SurveyQuestionElementBase {
  get question(): QuestionRichAnswerModel {
    return this.questionBase as QuestionRichAnswerModel;
  }

  protected override renderElement() {
    const q = this.question;
    const isReadOnly = this.isDisplayMode || q.isReadOnly;

    if (isReadOnly) {
      return <RichView value={q.value ?? ""} />;
    }

    return (
      <RichEditor
        value={typeof q.value === "string" ? q.value : ""}
        onChange={(v: string) => {
          q.value = v;
        }}
        ariaLabel={q.title}
        allowChem={subjectProfile().allowChem}
      />
    );
  }
}

let registered = false;

export function registerRichAnswer() {
  if (registered) return;
  registered = true;

  try {
    Serializer.addClass(
      RICH_ANSWER_TYPE,
      [],
      () => new QuestionRichAnswerModel(""),
      "question"
    );

    ElementFactory.Instance.registerElement(
      RICH_ANSWER_TYPE,
      (name) => new QuestionRichAnswerModel(name)
    );

    ReactQuestionFactory.Instance.registerQuestion(
      RICH_ANSWER_TYPE,
      (props) => createElement(SurveyQuestionRichAnswer, props)
    );
  } catch (err) {
    console.error("Failed to register SurveyJS richanswer custom component:", err);
  }
}
