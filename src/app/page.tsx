"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Add Table components

type QuestionType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "textarea"
  | "date"
  | "file"
  | "multi_select_dropdown"
  | "table"
  | "multi_text";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  rows?: number;
  maxSelections?: number;
  tableHeadings?: string[];
  maxEntries?: number; // For muti_text questions
}

export default function DynamicSurveyForm() {
  const [mounted, setMounted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formData, setFormData] = useState<{
    [key: string]:
      | string
      | string[]
      | { indicators: string[]; scores: { [key: string]: string } };
  }>({});
  const [loading, setLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState<{
    [key: string]: boolean;
  }>({});
  const [showOtherExplanation, setShowOtherExplanation] = useState<{
    [key: string]: boolean;
  }>({});
  // const [questionIdMap, setQuestionIdMap] = useState<{ [key: string]: number }>(
  //   {}
  // );
  const [currentPage, setCurrentPage] = useState(0);
  const [tableRows, setTableRows] = useState<{
    [key: string]: { indicator: string }[];
  }>({}); // Per-question table rows
  const questionsPerPage = 3;

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(
            "id, question_text, question_type, is_required, table_headings"
          );

        if (questionsError) {
          toast.error("Failed to fetch questions: " + questionsError.message);
          return;
        }

        if (!questionsData || questionsData.length === 0) {
          toast.error("No questions found in database.");
          setLoading(false);
          return;
        }

        const { data: optionsData, error: optionsError } = await supabase
          .from("question_options")
          .select("id, question_id, option_text");

        if (optionsError) {
          toast.error("Failed to fetch options: " + optionsError.message);
          return;
        }

        const mappedQuestions: Question[] = questionsData.map((q) => {
          const baseQuestion = {
            id: q.id.toString(),
            label: q.question_text,
            type: q.question_type as QuestionType,
            required: q.is_required,
            placeholder:
              q.question_type === "textarea"
                ? "Write your response here..."
                : `Enter your ${q.question_type}`,
            rows: q.question_type === "textarea" ? 4 : undefined,
            min: q.question_type === "number" ? 1 : undefined,
            max: q.question_type === "number" ? 120 : undefined,
          };

          // Use table_headings from Supabase if available
          if (q.question_type === "table" && q.table_headings) {
            return {
              ...baseQuestion,
              tableHeadings: q.table_headings,
            };
          }

          return {
            ...baseQuestion,
            options: optionsData
              .filter((opt) => opt.question_id === q.id)
              .map((opt) => opt.option_text),
            maxEntries: q.question_type === "multi_text" ? 3 : undefined, // Set maxEntries for multi_text
          };
        });

        setQuestions(mappedQuestions);

        const initialFormData = mappedQuestions.reduce((acc, q) => {
          if (q.type === "multi_select_dropdown" || q.type === "table") {
            acc[q.id] = { indicators: [], scores: {} };
          } else if (q.type === "checkbox") {
            acc[q.id] = [];
          } else if (q.type === "multi_text") {
            acc[q.id] = ["", "", ""]; // Initialize with 3 empty slots (q type muti_text)
          } else {
            acc[q.id] = "";
          }
          return acc;
        }, {} as { [key: string]: string | string[] | { indicators: string[]; scores: { [key: string]: string } } });

        setFormData(initialFormData);

        // const idMap = mappedQuestions.reduce((acc, q) => {
        //   acc[q.id] = Number.parseInt(q.id);
        //   return acc;
        // }, {} as { [key: string]: number });

        // setQuestionIdMap(idMap);
        setMounted(true);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error("Error fetching data: " + errorMessage);
        setLoading(false);
      }
    }

    if (typeof window !== "undefined") {
      fetchQuestions();
    }
  }, []);

  const handleInputChange = (
    id: string,
    value:
      | string
      | string[]
      | { indicators: string[]; scores: { [key: string]: string } },
    index?: number // New parameter for multi_text index
  ) => {
    // setFormData((prev) => ({ ...prev, [id]: value }));
    setFormData((prev) => {
      if (typeof index === "number" && Array.isArray(prev[id])) {
        const updatedValues = [...prev[id]];
        updatedValues[index] = value as string;
        return { ...prev, [id]: updatedValues };
      }
      return { ...prev, [id]: value };
    });
    if (typeof value === "string" && value === "Yes") {
      setShowExplanation((prev) => ({ ...prev, [id]: true }));
    } else if (typeof value === "string" && value === "No") {
      setShowExplanation((prev) => ({ ...prev, [id]: false }));
    }
    if (id.endsWith("-other")) {
      const questionId = id.replace("-other", "");
      if ((formData[questionId] as string[])?.includes("Other")) {
        setShowOtherExplanation((prev) => ({ ...prev, [questionId]: true }));
      }
    }
  };

  const handleCheckboxChange = (
    id: string,
    value: string,
    checked: boolean
  ) => {
    setFormData((prev) => {
      const currentValues = (prev[id] as string[]) || [];
      const updatedValues = checked
        ? [...currentValues, value]
        : currentValues.filter((item) => item !== value);
      if (value === "Other") {
        setShowOtherExplanation((prev) => ({ ...prev, [id]: checked }));
        if (checked && !prev[`${id}-other`]) {
          return {
            ...prev,
            [id]: updatedValues,
            [`${id}-other`]: "",
          };
        } else if (!checked) {
          return {
            ...prev,
            [id]: updatedValues,
            [`${id}-other`]: "",
          };
        }
      }
      return {
        ...prev,
        [id]: updatedValues,
      };
    });
  };

  const handleDropdownSelect = (id: string, selectedOption: string) => {
    setFormData((prev) => {
      const current = (prev[id] as {
        indicators: string[];
        scores: { [key: string]: string };
      }) || { indicators: [], scores: {} };

      if (current.indicators.includes(selectedOption)) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          indicators: [...current.indicators, selectedOption],
          scores: { ...current.scores },
        },
      };
    });
  };

  const handleRemoveIndicator = (id: string, indicator: string) => {
    setFormData((prev) => {
      const current = (prev[id] as {
        indicators: string[];
        scores: { [key: string]: string };
      }) || { indicators: [], scores: {} };

      const updatedIndicators = current.indicators.filter(
        (i) => i !== indicator
      );
      const updatedScores = { ...current.scores };
      delete updatedScores[indicator];

      return {
        ...prev,
        [id]: {
          indicators: updatedIndicators,
          scores: updatedScores,
        },
      };
    });
  };

  const handleScoreChange = (id: string, indicator: string, score: string) => {
    setFormData((prev) => {
      const current = (prev[id] as {
        indicators: string[];
        scores: { [key: string]: string };
      }) || { indicators: [], scores: {} };

      return {
        ...prev,
        [id]: {
          indicators: current.indicators,
          scores: { ...current.scores, [indicator]: score },
        },
      };
    });
  };

  const handleTableChange = (
    id: string,
    rowIndex: number,
    column: string,
    value: string
  ) => {
    setTableRows((prev) => {
      const newRows = [...(prev[id] || [])];
      if (column === "Indicator") {
        newRows[rowIndex] = { ...newRows[rowIndex], indicator: value };
      }
      return { ...prev, [id]: newRows };
    });
    const scores = (formData[id] as {
      indicators: string[];
      scores: { [key: string]: string };
    }) || {
      indicators: [],
      scores: {},
    };
    if (column !== "Indicator") {
      scores.scores[`${tableRows[id]?.[rowIndex]?.indicator || ""}-${column}`] =
        value;
      setFormData((prev) => ({ ...prev, [id]: scores }));
    }
  };

  const addRow = (id: string) => {
    setTableRows((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), { indicator: "" }],
    }));
    if (!formData[id]) {
      setFormData((prev) => ({
        ...prev,
        [id]: { indicators: [], scores: {} },
      }));
    }
  };
  const getCurrentQuestions = () => {
    const start = currentPage * questionsPerPage;
    const end = start + questionsPerPage;
    return questions.slice(start, end);
  };

  const validateRequiredFields = (questions: Question[]) => {
    for (const question of questions) {
      if (question.required) {
        const value = formData[question.id];

        // Handle table validation separately
        if (question.type === "table" && value) {
          const tableData = value as {
            indicators: string[];
            scores: { [key: string]: string };
          };

          // Check if scores are filled (ignore indicators array)
          const scoreValues = Object.values(tableData.scores);
          if (
            scoreValues.length === 0 ||
            scoreValues.some((score) => !score || score.trim() === "")
          ) {
            return false; // No scores or empty scores
          }

          // Table validation passed, continue to next question
          continue;
        }

        // Original validation for other question types
        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "object" &&
            value !== null &&
            "indicators" in value &&
            (value.indicators === undefined || value.indicators.length === 0))
        ) {
          return false; // Unanswered required field
        }

        if (question.type === "multi_text" && value) {
          const entries = value as string[];
          const maxEntries = question.maxEntries || 3;
          // Check if all defined entries (up to maxEntries) are non-empty
          for (let i = 0; i < maxEntries; i++) {
            if (!entries[i] || entries[i].trim() === "") {
              return false; // Any empty field fails validation
            }
          }
        }

        // Rest of your validation logic for other question types...
        if (question.type === "multi_select_dropdown" && value) {
          const dropdownData = value as {
            indicators: string[];
            scores: { [key: string]: string };
          };
          if (dropdownData.indicators.length === 0) {
            return false;
          }
        }

        if (question.type === "checkbox" && value) {
          const checkboxValues = value as string[];
          if (checkboxValues.length === 0) {
            return false;
          }

          if (
            checkboxValues.includes("Other") &&
            (!formData[`${question.id}-other`] ||
              (formData[`${question.id}-other`] as string).trim() === "")
          ) {
            return false;
          }
        }

        if (question.type === "radio" && value) {
          if (
            !value ||
            (showExplanation[question.id] &&
              !formData[`${question.id}-explanation`])
          ) {
            return false;
          }
        }

        if (
          question.type === "text" ||
          question.type === "email" ||
          question.type === "tel" ||
          question.type === "number" ||
          question.type === "date"
        ) {
          if (!value) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const currentQuestions = getCurrentQuestions();
    if (!validateRequiredFields(currentQuestions)) {
      toast.error(
        "Please fill all required fields (*) on this page before proceeding."
      );
      return;
    }
    setCurrentPage((prev) => prev + 1);
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage((prev) => prev - 1);
  };

  // Modify handleSubmit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentQuestions = getCurrentQuestions();
    if (!validateRequiredFields(currentQuestions)) {
      toast.error("Please fill all required fields (*) before submitting.");
      return;
    }
    try {
      const { data: optionsData } = await supabase
        .from("question_options")
        .select("id, question_id, option_text");

      const responses = questions.map((q) => {
        if (q.type === "multi_select_dropdown" || q.type === "table") {
          const current = formData[q.id] as {
            indicators: string[];
            scores: { [key: string]: string };
          };
          const selectedOptionIds = (optionsData ?? [])
            .filter(
              (opt) =>
                opt.question_id === parseInt(q.id) &&
                current.indicators.includes(opt.option_text)
            )
            .map((opt) => opt.id);
          return {
            question_id: parseInt(q.id),
            response_text:
              current.indicators.join(", ") +
              (Object.keys(current.scores).length
                ? ` (Scores: ${JSON.stringify(current.scores)})`
                : ""),
            response_option_ids:
              selectedOptionIds.length > 0 ? selectedOptionIds : null,
          };
        } else if (q.type === "checkbox") {
          const checkboxValues = formData[q.id] as string[];
          const selectedOptionIds = (optionsData ?? [])
            .filter(
              (opt) =>
                opt.question_id === parseInt(q.id) &&
                checkboxValues.includes(opt.option_text)
            )
            .map((opt) => opt.id);
          const otherText = checkboxValues.includes("Other")
            ? ` (Other: ${formData[`${q.id}-other`] || ""})`
            : "";
          return {
            question_id: parseInt(q.id),
            response_text: checkboxValues.join(", ") + otherText,
            response_option_ids:
              selectedOptionIds.length > 0 ? selectedOptionIds : null,
          };
        } else if (q.type === "multi_text") {
          const entries = (formData[q.id] as string[]).filter(
            (entry) => entry && entry.trim() !== ""
          );
          return {
            question_id: parseInt(q.id),
            response_text: entries.length > 0 ? entries.join("; ") : "",
            response_option_ids: null,
          };
        } else if (q.type === "radio") {
          const selectedOption = (optionsData ?? []).find(
            (opt) =>
              opt.question_id === parseInt(q.id) &&
              opt.option_text === formData[q.id]
          );
          const explanation = showExplanation[q.id]
            ? ` (Explanation: ${formData[`${q.id}-explanation`] || ""})`
            : "";
          return {
            question_id: parseInt(q.id),
            response_text: (formData[q.id] as string) + explanation,
            response_option_ids: selectedOption ? [selectedOption.id] : null,
          };
        } else {
          return {
            question_id: parseInt(q.id),
            response_text: formData[q.id] as string,
            response_option_ids: null,
          };
        }
      });

      const { error } = await supabase
        .from("survey_responses")
        .insert(responses);

      if (error) {
        toast.error("Failed to save responses: " + error.message);
        return;
      }

      toast.success("Form Submitted Successfully!", {
        description: "Thank you for your response.",
        duration: 3000,
      });

      const resetFormData = questions.reduce((acc, q) => {
        if (q.type === "multi_select_dropdown" || q.type === "table") {
          acc[q.id] = { indicators: [], scores: {} };
        } else if (q.type === "checkbox") {
          acc[q.id] = [];
        } else {
          acc[q.id] = "";
        }
        if (q.type === "radio" && showExplanation[q.id]) {
          acc[`${q.id}-explanation`] = "";
        }
        if (q.type === "checkbox" && showOtherExplanation[q.id]) {
          acc[`${q.id}-other`] = "";
        }
        return acc;
      }, {} as { [key: string]: string | string[] | { indicators: string[]; scores: { [key: string]: string } } });
      setFormData(resetFormData);
      setTableRows({});
      setCurrentPage(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error saving responses: " + errorMessage);
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
      case "date":
        return (
          <div>
            <Label htmlFor={question.id} className="text-sm font-medium">
              {question.label} {question.required && "*"}
            </Label>
            <Input
              id={question.id}
              type={question.type}
              value={formData[question.id] as string}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
              min={question.min}
              max={question.max}
              className="mt-1"
            />
          </div>
        );

      case "radio":
        return (
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {question.label} {question.required && "*"}
            </Label>
            <RadioGroup
              value={formData[question.id] as string}
              onValueChange={(value) => handleInputChange(question.id, value)}
              className="space-y-2"
            >
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option}
                    id={`${question.id}-${option}`}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {showExplanation[question.id] && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">
                  Please explain:
                </Label>
                <Textarea
                  id={`${question.id}-explanation`}
                  value={
                    (formData[`${question.id}-explanation`] as string) || ""
                  }
                  onChange={(e) =>
                    handleInputChange(
                      `${question.id}-explanation`,
                      e.target.value
                    )
                  }
                  placeholder="Enter your explanation here..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {question.label} {question.required && "*"}
            </Label>
            <div className="space-y-3">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={(formData[question.id] as string[])?.includes(
                      option
                    )}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(
                        question.id,
                        option,
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
              {showOtherExplanation[question.id] && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Please specify other:
                  </Label>
                  <Textarea
                    id={`${question.id}-other`}
                    value={(formData[`${question.id}-other`] as string) || ""}
                    onChange={(e) =>
                      handleInputChange(`${question.id}-other`, e.target.value)
                    }
                    placeholder="Enter your other option here..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case "multi_text":
        const entries = (formData[question.id] as string[]) || [];
        const maxEntries = question.maxEntries || 3;
        return (
          <div>
            <Label className="text-sm font-medium mb-3 block">
              {question.label} {question.required && "*"}
            </Label>
            {Array.from({ length: maxEntries }, (_, i) => (
              <div key={i} className="mb-3">
                <Label
                  htmlFor={`${question.id}-${i}`}
                  className="text-sm font-medium"
                >
                  {i + 1}.{" "}
                </Label>
                <Input
                  id={`${question.id}-${i}`}
                  value={entries[i] || ""}
                  onChange={(e) =>
                    handleInputChange(question.id, e.target.value, i)
                  }
                  placeholder={question.placeholder || "Enter combination"}
                  className="mt-1"
                  disabled={
                    i >= entries.filter(Boolean).length &&
                    entries.filter(Boolean).length >= maxEntries
                  }
                />
              </div>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {question.label} {question.required && "*"}
            </Label>
            <Select
              value={formData[question.id] as string}
              onValueChange={(value) => handleInputChange(question.id, value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={question.placeholder || "Select an option"}
                />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "textarea":
        return (
          <div>
            <Label
              htmlFor={question.id}
              className="text-sm font-medium mb-2 block"
            >
              {question.label} {question.required && "*"}
            </Label>
            <Textarea
              id={question.id}
              value={formData[question.id] as string}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              rows={question.rows || 4}
              className="resize-none"
            />
          </div>
        );

      case "file":
        return (
          <div>
            <Label
              htmlFor={question.id}
              className="text-sm font-medium mb-2 block"
            >
              {question.label} {question.required && "*"}
            </Label>
            <Input
              id={question.id}
              type="file"
              onChange={(e) =>
                handleInputChange(question.id, e.target.files?.[0]?.name || "")
              }
              required={question.required}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Note: File uploads are not saved to Supabase in this example.
            </p>
          </div>
        );

      case "multi_select_dropdown":
        const currentData = (formData[question.id] as {
          indicators: string[];
          scores: { [key: string]: string };
        }) || { indicators: [], scores: {} };

        const availableOptions =
          question.options?.filter(
            (option) => !currentData.indicators.includes(option)
          ) || [];

        return (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {question.label} {question.required && "*"}
            </Label>

            <Select
              value=""
              onValueChange={(value) =>
                handleDropdownSelect(question.id, value)
              }
            >
              <SelectTrigger className="mb-4">
                <SelectValue placeholder="Select indicators to add..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {availableOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentData.indicators.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Selected Indicators ({currentData.indicators.length}/10):
                </Label>
                {currentData.indicators.map((indicator) => (
                  <div
                    key={indicator}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <Badge variant="secondary" className="flex-shrink-0">
                      <Checkbox
                        checked={true}
                        className="mr-2 h-3 w-3"
                        disabled
                      />
                      {indicator}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0 hover:bg-red-100"
                        onClick={() =>
                          handleRemoveIndicator(question.id, indicator)
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={currentData.scores[indicator] || ""}
                      onChange={(e) =>
                        handleScoreChange(
                          question.id,
                          indicator,
                          e.target.value
                        )
                      }
                      placeholder="Score (1-10)"
                      className="w-24 flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}

            {availableOptions.length > 0 &&
              currentData.indicators.length > 0 && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    Available Options ({availableOptions.length} remaining):
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {availableOptions.slice(0, 10).map((option) => (
                      <Badge
                        key={option}
                        variant="outline"
                        className="text-xs text-gray-400"
                      >
                        {option}
                      </Badge>
                    ))}
                    {availableOptions.length > 10 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-gray-400"
                      >
                        +{availableOptions.length - 10} more...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
          </div>
        );

      case "table":
        return (
          <div>
            <Label className="text-sm font-medium mb-2 block text-foreground">
              {question.label} {question.required && "*"}
            </Label>
            <Table>
              <TableHeader>
                <TableRow>
                  {question.tableHeadings?.map((heading) => (
                    <TableHead key={heading} className="text-foreground">
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tableRows[question.id] || []).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={row.indicator}
                        onChange={(e) =>
                          handleTableChange(
                            question.id,
                            index,
                            "Indicator",
                            e.target.value
                          )
                        }
                        placeholder="Enter indicator"
                        className="w-full p-2 border border-border rounded-md"
                      />
                    </TableCell>
                    {question.tableHeadings?.slice(1).map((heading) => (
                      <TableCell key={heading}>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={
                            (
                              formData[question.id] as {
                                indicators: string[];
                                scores: { [key: string]: string };
                              }
                            )?.scores[`${row.indicator}-${heading}`] || ""
                          }
                          onChange={(e) =>
                            handleTableChange(
                              question.id,
                              index,
                              heading,
                              e.target.value
                            )
                          }
                          placeholder="Rate (1-10)"
                          className="w-full p-2 border border-border rounded-md"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              type="button"
              onClick={() => addRow(question.id)}
              className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
            >
              Add Row
            </Button>
          </div>
        );

      default:
        return <p>Unsupported question type: {question.type}</p>;
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestions = getCurrentQuestions();
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen py-8 px-4 survey-background">
      <div className="fixed left-0 top-0 h-full md:w-12 bg-gray-700 bg-opacity-90 flex items-center justify-center z-50">
        <div
          className="text-white font-black md:text-lg uppercase tracking-widest h-full flex flex-col justify-center items-center"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            letterSpacing: "0.3em",
            lineHeight: "1.2",
          }}
        >
          SolAlly ML Team
        </div>
      </div>

      <div className="min-h-screen bg-trasparent py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6 bg-gray-500 text-white">
            <CardHeader className="rounded-t-lg">
              <CardTitle className="text-2xl ">Customer Survey Form</CardTitle>
              <CardDescription className="text-blue-100">
                Please fill out this form to help us serve you better. Page{" "}
                {currentPage + 1} of {totalPages}.
              </CardDescription>
            </CardHeader>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentQuestions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Question {currentPage * questionsPerPage + index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderQuestion(question)}</CardContent>
              </Card>
            ))}

            <div className="flex justify-between pt-4">
              {currentPage > 0 && (
                <Button
                  type="button"
                  onClick={handleBack}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2 text-lg"
                >
                  Back
                </Button>
              )}
              {!isLastPage ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-lg"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-lg"
                >
                  Submit Survey
                </Button>
              )}
            </div>
          </form>

          <div className="text-center mt-8 text-white text-sm z-50 bg-gray-500 opacity-75 p-4 rounded-lg">
            <p>Thank you for taking the time to complete our survey!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
