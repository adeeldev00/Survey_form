"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
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
import { X, ChevronDown, Search } from "lucide-react";
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
  sequence: number;
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

  // Add search functionality states
  const [dropdownStates, setDropdownStates] = useState<{
    [key: string]: { isOpen: boolean; searchTerm: string };
  }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const searchInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {}
  );

  const questionsPerPage = 3;

  //gmail validation regex
  const gmailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(
            "id, question_text, question_type, is_required, table_headings, sequence"
          )
          .order("sequence", { ascending: true });

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
            sequence: q.sequence || 0,
          };

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
            maxEntries: q.question_type === "multi_text" ? 3 : undefined,
          };
        });

        setQuestions(mappedQuestions);

        const initialFormData = mappedQuestions.reduce((acc, q) => {
          if (q.type === "multi_select_dropdown" || q.type === "table") {
            acc[q.id] = { indicators: [], scores: {} };
          } else if (q.type === "checkbox") {
            acc[q.id] = [];
          } else if (q.type === "multi_text") {
            acc[q.id] = ["", "", ""];
          } else {
            acc[q.id] = "";
          }
          return acc;
        }, {} as { [key: string]: string | string[] | { indicators: string[]; scores: { [key: string]: string } } });

        setFormData(initialFormData);
        const initialTableRows = mappedQuestions.reduce((acc, q) => {
          if (q.type === "table") {
            acc[q.id] = [{ indicator: "" }]; // Initialize with 2 empty rows
          }
          return acc;
        }, {} as { [key: string]: { indicator: string }[] });
        setTableRows(initialTableRows);

        const initialDropdownStates = mappedQuestions.reduce((acc, q) => {
          if (q.type === "multi_select_dropdown") {
            acc[q.id] = { isOpen: false, searchTerm: "" };
          }
          return acc;
        }, {} as { [key: string]: { isOpen: boolean; searchTerm: string } });

        setDropdownStates(initialDropdownStates);

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
  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((questionId) => {
        const ref = dropdownRefs.current[questionId];
        if (ref && !ref.contains(event.target as Node)) {
          setDropdownStates((prev) => ({
            ...prev,
            [questionId]: { isOpen: false, searchTerm: "" },
          }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    Object.keys(dropdownStates).forEach((questionId) => {
      if (
        dropdownStates[questionId].isOpen &&
        searchInputRefs.current[questionId]
      ) {
        searchInputRefs.current[questionId]?.focus();
      }
    });
  }, [dropdownStates]);

  const handleInputChange = (
    id: string,
    value:
      | string
      | string[]
      | { indicators: string[]; scores: { [key: string]: string } },
    index?: number // New parameter for multi_text index
  ) => {
    // setFormData((prev) => ({ ...prev, [id]: value }));
    toast.dismiss();
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

    // Close dropdown and reset search
    setDropdownStates((prev) => ({
      ...prev,
      [id]: { isOpen: false, searchTerm: "" },
    }));
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
      const numValue = Math.min(10, Math.max(0, Number.parseInt(value) || 0));
      scores.scores[`${tableRows[id]?.[rowIndex]?.indicator || ""}-${column}`] =
        numValue.toString();
      setFormData((prev) => ({ ...prev, [id]: scores }));
    }
  };

  const handleRemoveRow = (id: string, rowIndex: number) => {
    setTableRows((prev) => {
      const newRows = [...(prev[id] || [])];
      newRows.splice(rowIndex, 1);
      return { ...prev, [id]: newRows };
    });

    // Also remove scores for this row
    setFormData((prev) => {
      const current = (prev[id] as {
        indicators: string[];
        scores: { [key: string]: string };
      }) || { indicators: [], scores: {} };

      const updatedScores = { ...current.scores };
      const rowIndicator = tableRows[id]?.[rowIndex]?.indicator || "";

      // Remove all scores for this row
      Object.keys(updatedScores).forEach((key) => {
        if (key.startsWith(`${rowIndicator}-`)) {
          delete updatedScores[key];
        }
      });

      return {
        ...prev,
        [id]: {
          indicators: current.indicators,
          scores: updatedScores,
        },
      };
    });
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

  const calculateProgress = () => {
    let answeredQuestions = 0;
    const totalQuestions = questions.length;

    questions.forEach((question) => {
      const value = formData[question.id];
      let isAnswered = false;

      if (
        question.type === "multi_select_dropdown" ||
        question.type === "table"
      ) {
        const data = value as {
          indicators: string[];
          scores: { [key: string]: string };
        };
        isAnswered = data && data.indicators && data.indicators.length > 0;
      } else if (question.type === "checkbox") {
        const checkboxValues = value as string[];
        isAnswered = checkboxValues && checkboxValues.length > 0;
      } else if (question.type === "multi_text") {
        const entries = value as string[];
        isAnswered =
          entries && entries.some((entry) => entry && entry.trim() !== "");
      } else {
        isAnswered = value !== "" && value !== undefined && value !== null;
      }

      if (isAnswered) {
        answeredQuestions++;
      }
    });

    return {
      completed: answeredQuestions,
      total: totalQuestions,
      percentage:
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0,
    };
  };

  const validateRequiredFields = (questions: Question[]): string | null => {
    for (const question of questions) {
      if (question.required) {
        const value = formData[question.id];

        //this validation is for gmail email
        if (question.id === "14" && value) {
          const email = value as string;
          if (!gmailRegex.test(email)) {
            return "Please enter a valid Gmail address (e.g., example@gmail.com) for 'Provide Your Gmail'.";
          }
        }
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
            return `All fields for "${question.label}" must be filled.`; // No scores or empty scores
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
          return `Please fill all scores for "${question.label}".`; // Unanswered required field
        }

        if (question.type === "multi_text" && value) {
          const entries = value as string[];
          const maxEntries = question.maxEntries || 3;
          // Check if all defined entries (up to maxEntries) are non-empty
          for (let i = 0; i < maxEntries; i++) {
            if (!entries[i] || entries[i].trim() === "") {
              return `All fields for "${question.label}" must be filled.`; // Any empty field fails validation
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
            return `Please select at least one option for "${question.label}".`;
          }
        }

        if (question.type === "checkbox" && value) {
          const checkboxValues = value as string[];
          if (checkboxValues.length === 0) {
            return `Please select at least one option for "${question.label}".`;
          }
          if (
            checkboxValues.includes("Other") &&
            (!formData[`${question.id}-other`] ||
              (formData[`${question.id}-other`] as string).trim() === "")
          ) {
            return `Please specify the "Other" option for "${question.label}".`;
          }
        }

        if (question.type === "radio" && value) {
          if (
            !value ||
            (showExplanation[question.id] &&
              !formData[`${question.id}-explanation`])
          ) {
            return `Please select an option for "${question.label}".`;
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
            return `The field "${question.label}" is required.`;
          }
        }
      }
    }
    return null;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const currentQuestions = getCurrentQuestions();
    const errorMessage = validateRequiredFields(currentQuestions);
    if (errorMessage) {
      toast.dismiss(); // Clear any existing toasts
      toast.error(errorMessage);
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
                opt.question_id === Number.parseInt(q.id) &&
                current.indicators.includes(opt.option_text)
            )
            .map((opt) => opt.id);

          return {
            question_id: Number.parseInt(q.id),
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
                opt.question_id === Number.parseInt(q.id) &&
                checkboxValues.includes(opt.option_text)
            )
            .map((opt) => opt.id);

          const otherText = checkboxValues.includes("Other")
            ? ` (Other: ${formData[`${q.id}-other`] || ""})`
            : "";

          return {
            question_id: Number.parseInt(q.id),
            response_text: checkboxValues.join(", ") + otherText,
            response_option_ids:
              selectedOptionIds.length > 0 ? selectedOptionIds : null,
          };
        } else if (q.type === "multi_text") {
          const entries = (formData[q.id] as string[]).filter(
            (entry) => entry && entry.trim() !== ""
          );
          return {
            question_id: Number.parseInt(q.id),
            response_text: entries.length > 0 ? entries.join("; ") : "",
            response_option_ids: null,
          };
        } else if (q.type === "radio") {
          const selectedOption = (optionsData ?? []).find(
            (opt) =>
              opt.question_id === Number.parseInt(q.id) &&
              opt.option_text === formData[q.id]
          );

          const explanation = showExplanation[q.id]
            ? ` (Explanation: ${formData[`${q.id}-explanation`] || ""})`
            : "";

          return {
            question_id: Number.parseInt(q.id),
            response_text: (formData[q.id] as string) + explanation,
            response_option_ids: selectedOption ? [selectedOption.id] : null,
          };
        } else {
          return {
            question_id: Number.parseInt(q.id),
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

        const dropdownState = dropdownStates[question.id] || {
          isOpen: false,
          searchTerm: "",
        };
        const filteredOptions = availableOptions.filter((option) =>
          option.toLowerCase().includes(dropdownState.searchTerm.toLowerCase())
        );

        return (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {question.label} {question.required && "*"}
            </Label>

            {/* Custom Searchable Dropdown */}
            <div
              className="relative mb-4"
              ref={(el) => {
                dropdownRefs.current[question.id] = el;
              }}
            >
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-left font-normal bg-transparent"
                onClick={() =>
                  setDropdownStates((prev) => ({
                    ...prev,
                    [question.id]: {
                      ...prev[question.id],
                      isOpen: !prev[question.id]?.isOpen,
                    },
                  }))
                }
              >
                <span className="text-muted-foreground">
                  Select indicators to add...
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>

              {dropdownState.isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        ref={(el) => {
                          searchInputRefs.current[question.id] = el;
                        }}
                        type="text"
                        placeholder="Search indicators..."
                        value={dropdownState.searchTerm}
                        onChange={(e) =>
                          setDropdownStates((prev) => ({
                            ...prev,
                            [question.id]: {
                              ...prev[question.id],
                              searchTerm: e.target.value,
                            },
                          }))
                        }
                        className="pl-8 h-8"
                      />
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                          onClick={() =>
                            handleDropdownSelect(question.id, option)
                          }
                        >
                          {option}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {dropdownState.searchTerm
                          ? `No indicators found for "${dropdownState.searchTerm}"`
                          : "No indicators available"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentData.indicators.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Selected Indicators ({currentData.indicators.length}/10):
                </Label>
                {currentData.indicators.map((indicator) => (
                  <div
                    key={indicator}
                    className="p-3 bg-gray-100 rounded-lg space-y-2"
                  >
                    {/* Mobile-friendly layout: Stack elements vertically */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Checkbox
                          checked={true}
                          className="h-3 w-3 flex-shrink-0"
                          disabled
                        />
                        <Badge
                          variant="secondary"
                          className="flex-shrink-0 max-w-full truncate"
                        >
                          <span className="truncate">{indicator}</span>
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 flex-shrink-0 ml-2"
                        onClick={() =>
                          handleRemoveIndicator(question.id, indicator)
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Score input on separate line for mobile */}
                    <div className="flex items-center space-x-2">
                      <Label className="text-xs text-gray-600 flex-shrink-0">
                        Score:
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={currentData.scores[indicator] || ""}
                        onChange={(e) => {
                          const numValue = Math.min(
                            10,
                            Math.max(0, Number.parseInt(e.target.value) || 0)
                          );
                          handleScoreChange(
                            question.id,
                            indicator,
                            numValue.toString()
                          );
                        }}
                        placeholder="1-10"
                        className="w-20 flex-shrink-0"
                      />
                    </div>
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

      // case "table":
      //   return (
      //     <div>
      //       <Label className="text-sm font-medium mb-2 block text-foreground">
      //         {question.label} {question.required && "*"}
      //       </Label>
      //       <Table>
      //         <TableHeader>
      //           <TableRow>
      //             {question.tableHeadings?.map((heading) => (
      //               <TableHead key={heading} className="text-foreground">
      //                 {heading}
      //               </TableHead>
      //             ))}
      //           </TableRow>
      //         </TableHeader>
      //         <TableBody>
      //           {(tableRows[question.id] || []).map((row, index) => (
      //             <TableRow key={index}>
      //               <TableCell>
      //                 <Input
      //                   value={row.indicator}
      //                   onChange={(e) =>
      //                     handleTableChange(
      //                       question.id,
      //                       index,
      //                       "Indicator",
      //                       e.target.value
      //                     )
      //                   }
      //                   placeholder="Enter indicator"
      //                   className="w-full p-2 border border-border rounded-md"
      //                 />
      //               </TableCell>
      //               {question.tableHeadings?.slice(1).map((heading) => (
      //                 <TableCell key={heading}>
      //                   <Input
      //                     type="number"
      //                     min="1"
      //                     max="10"
      //                     value={
      //                       (
      //                         formData[question.id] as {
      //                           indicators: string[];
      //                           scores: { [key: string]: string };
      //                         }
      //                       )?.scores[`${row.indicator}-${heading}`] || ""
      //                     }
      //                     onChange={(e) =>
      //                       handleTableChange(
      //                         question.id,
      //                         index,
      //                         heading,
      //                         e.target.value
      //                       )
      //                     }
      //                     placeholder="Rate (1-10)"
      //                     className="w-full p-2 border border-border rounded-md"
      //                   />
      //                 </TableCell>
      //               ))}
      //             </TableRow>
      //           ))}
      //         </TableBody>
      //       </Table>
      //       <Button
      //         type="button"
      //         onClick={() => addRow(question.id)}
      //         className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
      //       >
      //         Add Row
      //       </Button>
      //     </div>
      //   );

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
                  <TableHead className="text-foreground w-20">Action</TableHead>
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
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRow(question.id, index)}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        disabled={(tableRows[question.id] || []).length <= 1}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
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
    <div className="min-h-screen p-0 md:py-8 md:px-4 survey-background">
      <div className="fixed left-0 top-0 h-full md:w-12 bg-gray-700 bg-opacity-90 flex items-center justify-center z-50">
        <div
          className=" text-white font-black md:text-lg uppercase tracking-widest h-full md:flex flex-col justify-center items-center hidden"
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
          {/* Add this section right after the Customer Survey Form Card and before the <form> tag */}
          <Card className="mb-6 bg-white">
            <CardContent className="">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-gray-700">
                    Form Progress
                  </Label>
                  <span className="text-sm text-gray-600">
                    {calculateProgress().completed} of{" "}
                    {calculateProgress().total} questions completed
                  </span>
                </div>
                <Progress
                  value={calculateProgress().percentage}
                  className="w-full h-2 bg-gray-200 rounded-lg "
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Completed: {calculateProgress().completed}</span>
                  <span>{calculateProgress().percentage}%</span>
                  <span>
                    Remaining:{" "}
                    {calculateProgress().total - calculateProgress().completed}
                  </span>
                </div>
              </div>
            </CardContent>
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
