// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { toast } from "sonner";
// import { supabase } from "@/lib/supabase";

// // Define question types (extensible for future types)
// type QuestionType =
//   | "text"
//   | "email"
//   | "tel"
//   | "number"
//   | "radio"
//   | "checkbox"
//   | "dropdown"
//   | "textarea"
//   | "date"
//   | "file"
//   | "multi_select_dropdown";

// // Define question configuration structure
// interface Question {
//   id: string;
//   label: string;
//   type: QuestionType;
//   required?: boolean;
//   options?: string[];
//   placeholder?: string;
//   min?: number;
//   max?: number;
//   rows?: number;
// }

// export default function DynamicSurveyForm() {
//   const [mounted, setMounted] = useState(false);
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [formData, setFormData] = useState<{
//     [key: string]: string | string[];
//   }>({});
//   const [loading, setLoading] = useState(true);
//   // const [questionIdMap, setQuestionIdMap] = useState<{ [key: string]: number }>(
//   //   {}
//   // );
//   const [currentPage, setCurrentPage] = useState(0);
//   const questionsPerPage = 2;

//   // Fetch questions and options from Supabase
//   useEffect(() => {
//     async function fetchQuestions() {
//       try {
//         setLoading(true);
//         // Fetch questions
//         const { data: questionsData, error: questionsError } = await supabase
//           .from("questions")
//           .select("id, question_text, question_type, is_required");

//         if (questionsError) {
//           toast.error("Failed to fetch questions: " + questionsError.message);
//           console.error("Questions Error:", questionsError);
//           return;
//         }

//         if (!questionsData || questionsData.length === 0) {
//           toast.error("No questions found in database.");
//           setLoading(false);
//           return;
//         }

//         // Fetch options
//         const { data: optionsData, error: optionsError } = await supabase
//           .from("question_options")
//           .select("id, question_id, option_text");

//         if (optionsError) {
//           toast.error("Failed to fetch options: " + optionsError.message);
//           console.error("Options Error:", optionsError);
//           return;
//         }

//         // Map questions to Question interface
//         const mappedQuestions: Question[] = questionsData.map((q) => ({
//           id: q.id.toString(),
//           label: q.question_text,
//           type: q.question_type as QuestionType,
//           required: q.is_required,
//           options: optionsData
//             .filter((opt) => opt.question_id === q.id)
//             .map((opt) => opt.option_text),
//           placeholder:
//             q.question_type === "textarea"
//               ? "Write your response here..."
//               : `Enter your ${q.question_type}`,
//           rows: q.question_type === "textarea" ? 4 : undefined,
//           min: q.question_type === "number" ? 1 : undefined,
//           max: q.question_type === "number" ? 120 : undefined,
//         }));

//         setQuestions(mappedQuestions);

//         // Initialize formData
//         const initialFormData = mappedQuestions.reduce((acc, q) => {
//           acc[q.id] = q.type === "checkbox" ? [] : "";
//           return acc;
//         }, {} as { [key: string]: string | string[] });
//         setFormData(initialFormData);

//         // Create questionIdMap for saving responses
//         // const idMap = mappedQuestions.reduce((acc, q) => {
//         //   acc[q.id] = parseInt(q.id);
//         //   return acc;
//         // }, {} as { [key: string]: number });
//         // setQuestionIdMap(idMap);

//         setMounted(true);
//         setLoading(false);
//       } catch (err) {
//         const errorMessage = err instanceof Error ? err.message : String(err);
//         toast.error("Error fetching data: " + errorMessage);
//         console.error("Error:", err);
//         setLoading(false);
//       }
//     }
//     fetchQuestions();
//   }, []);

//   // Handle input changes
//   const handleInputChange = (id: string, value: string | string[]) => {
//     setFormData((prev) => ({ ...prev, [id]: value }));
//   };

//   // Handle checkbox changes
//   const handleCheckboxChange = (
//     id: string,
//     value: string,
//     checked: boolean
//   ) => {
//     setFormData((prev) => {
//       const currentValues = (prev[id] as string[]) || [];
//       return {
//         ...prev,
//         [id]: checked
//           ? [...currentValues, value]
//           : currentValues.filter((item) => item !== value),
//       };
//     });
//   };

//   // Get current page questions
//   const getCurrentQuestions = () => {
//     const start = currentPage * questionsPerPage;
//     const end = start + questionsPerPage;
//     return questions.slice(start, end);
//   };

//   // Handle Next button
//   const handleNext = (e: React.MouseEvent) => {
//     e.preventDefault(); // Prevent any form submission
//     setCurrentPage((prev) => prev + 1);
//   };

//   // Handle Back button
//   const handleBack = (e: React.MouseEvent) => {
//     e.preventDefault(); // Prevent any form submission
//     setCurrentPage((prev) => prev - 1);
//   };

//   // Handle form submission
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     // Validate required fields (only for Submit)
//     const unanswered = questions.filter(
//       (q) =>
//         q.required &&
//         (q.type === "checkbox"
//           ? (formData[q.id] as string[]).length === 0
//           : !formData[q.id])
//     );
//     if (unanswered.length > 0) {
//       toast.error("Please answer all required questions.");
//       return;
//     }

//     try {
//       // Fetch options for accurate option IDs
//       const { data: optionsData } = await supabase
//         .from("question_options")
//         .select("id, question_id, option_text");

//       // Map formData to survey_responses
//       const responses = questions.map((q) => {
//         if (q.type === "checkbox") {
//           const selectedOptionIds = (optionsData ?? [])
//             .filter(
//               (opt) =>
//                 opt.question_id === parseInt(q.id) &&
//                 (formData[q.id] as string[]).includes(opt.option_text)
//             )
//             .map((opt) => opt.id);
//           return {
//             question_id: parseInt(q.id),
//             response_text:
//               (formData[q.id] as string[]).length > 0
//                 ? (formData[q.id] as string[]).join(", ")
//                 : "",
//             response_option_ids:
//               selectedOptionIds.length > 0 ? selectedOptionIds : null,
//           };
//         } else if (q.type === "radio" || q.type === "dropdown") {
//           const selectedOption = (optionsData ?? []).find(
//             (opt) =>
//               opt.question_id === parseInt(q.id) &&
//               opt.option_text === formData[q.id]
//           );
//           return {
//             question_id: parseInt(q.id),
//             response_text: formData[q.id] as string,
//             response_option_ids: selectedOption ? [selectedOption.id] : null,
//           };
//         } else {
//           return {
//             question_id: parseInt(q.id),
//             response_text: formData[q.id] as string,
//             response_option_ids: null,
//           };
//         }
//       });

//       const { error } = await supabase
//         .from("survey_responses")
//         .insert(responses);

//       if (error) {
//         toast.error("Failed to save responses: " + error.message);
//         console.error("Response Error:", error);
//         return;
//       }

//       toast.success("Form Submitted Successfully!", {
//         description: "Thank you for your response.",
//         duration: 3000,
//       });

//       // Reset form and page
//       const resetFormData = questions.reduce((acc, q) => {
//         acc[q.id] = q.type === "checkbox" ? [] : "";
//         return acc;
//       }, {} as { [key: string]: string | string[] });
//       setFormData(resetFormData);
//       setCurrentPage(0);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : String(err);
//       toast.error("Error saving responses: " + errorMessage);
//       console.error("Error:", err);
//     }
//   };

//   // Render a single question based on type
//   const renderQuestion = (question: Question) => {
//     switch (question.type) {
//       case "text":
//       case "email":
//       case "tel":
//       case "number":
//       case "date":
//         return (
//           <div>
//             <Label htmlFor={question.id} className="text-sm font-medium">
//               {question.label} {question.required && "*"}
//             </Label>
//             <Input
//               id={question.id}
//               type={question.type}
//               value={formData[question.id] as string}
//               onChange={(e) => handleInputChange(question.id, e.target.value)}
//               placeholder={question.placeholder}
//               required={question.required}
//               min={question.min}
//               max={question.max}
//               className="mt-1"
//             />
//           </div>
//         );

//       case "radio":
//         return (
//           <div>
//             <Label className="text-sm font-medium mb-3 block">
//               {question.label} {question.required && "*"}
//             </Label>
//             <RadioGroup
//               value={formData[question.id] as string}
//               onValueChange={(value) => handleInputChange(question.id, value)}
//               className="space-y-2"
//             >
//               {question.options?.map((option) => (
//                 <div key={option} className="flex items-center space-x-2">
//                   <RadioGroupItem
//                     value={option}
//                     id={`${question.id}-${option}`}
//                   />
//                   <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
//                 </div>
//               ))}
//             </RadioGroup>
//           </div>
//         );

//       case "checkbox":
//         return (
//           <div>
//             <Label className="text-sm font-medium mb-3 block">
//               {question.label} {question.required && "*"}
//             </Label>
//             <div className="space-y-3">
//               {question.options?.map((option) => (
//                 <div key={option} className="flex items-center space-x-2">
//                   <Checkbox
//                     id={`${question.id}-${option}`}
//                     checked={(formData[question.id] as string[])?.includes(
//                       option
//                     )}
//                     onCheckedChange={(checked) =>
//                       handleCheckboxChange(
//                         question.id,
//                         option,
//                         checked as boolean
//                       )
//                     }
//                   />
//                   <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
//                 </div>
//               ))}
//             </div>
//           </div>
//         );

//       case "dropdown":
//         return (
//           <div>
//             <Label className="text-sm font-medium mb-2 block">
//               {question.label} {question.required && "*"}
//             </Label>
//             <Select
//               value={formData[question.id] as string}
//               onValueChange={(value) => handleInputChange(question.id, value)}
//             >
//               <SelectTrigger>
//                 <SelectValue
//                   placeholder={question.placeholder || "Select an option"}
//                 />
//               </SelectTrigger>
//               <SelectContent>
//                 {question.options?.map((option) => (
//                   <SelectItem key={option} value={option}>
//                     {option}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         );

//       case "textarea":
//         return (
//           <div>
//             <Label
//               htmlFor={question.id}
//               className="text-sm font-medium mb-2 block"
//             >
//               {question.label} {question.required && "*"}
//             </Label>
//             <Textarea
//               id={question.id}
//               value={formData[question.id] as string}
//               onChange={(e) => handleInputChange(question.id, e.target.value)}
//               placeholder={question.placeholder}
//               rows={question.rows || 4}
//               className="resize-none"
//             />
//           </div>
//         );

//       case "file":
//         return (
//           <div>
//             <Label
//               htmlFor={question.id}
//               className="text-sm font-medium mb-2 block"
//             >
//               {question.label} {question.required && "*"}
//             </Label>
//             <Input
//               id={question.id}
//               type="file"
//               onChange={(e) =>
//                 handleInputChange(question.id, e.target.files?.[0]?.name || "")
//               }
//               required={question.required}
//               className="mt-1"
//             />
//             <p className="text-sm text-gray-500 mt-1">
//               Note: File uploads are not saved to Supabase in this example.
//             </p>
//           </div>
//         );

//       default:
//         return <p>Unsupported question type: {question.type}</p>;
//     }
//   };

//   if (!mounted || loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 py-8 px-4">
//         <div className="max-w-2xl mx-auto">
//           <div className="animate-pulse">
//             <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
//             <div className="space-y-6">
//               {[1, 2].map((i) => (
//                 <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const currentQuestions = getCurrentQuestions();
//   const totalPages = Math.ceil(questions.length / questionsPerPage);
//   const isLastPage = currentPage === totalPages - 1;

// return (
//   <div
//     className="min-h-screen py-8 px-4"
//     style={{
//       backgroundImage: "url('/background.jpg')", // Local image in /public
//       // OR use online URL: `url('https://example.com/background.jpg')`
//       backgroundSize: "cover", // Cover the entire area
//       backgroundPosition: "center", // Center the image
//       backgroundRepeat: "no-repeat", // Prevent tiling
//     }}
//   >
//     {/* Vertical Banner */}
//     {/* <div className="fixed left-0 top-0 h-full w-12 bg-gray-700 bg-opacity-90 flex items-center justify-center z-50">
//       <span
//         className="text-white font-bold text-sm uppercase tracking-wider"
//         style={{
//           writingMode: "vertical-rl",
//           textOrientation: "mixed",
//           transform: "rotate(180deg)",
//         }}
//       >
//         SolAlly ML Team
//       </span>
//     </div> */}
//     <div className="fixed left-0 top-0 h-full w-12 bg-gray-700 bg-opacity-90 flex items-center justify-center z-50">
//       <div
//         className="text-white font-black text-lg uppercase tracking-widest h-full flex flex-col justify-center items-center"
//         style={{
//           writingMode: "vertical-rl",
//           textOrientation: "mixed",
//           transform: "rotate(180deg)",
//           letterSpacing: "0.3em",
//           lineHeight: "1.2",
//         }}
//       >
//         SolAlly ML Team
//       </div>
//     </div>
//     <div className="min-h-screen bg-trasparent py-8 px-4">
//       <div className="max-w-2xl mx-auto">
//         <Card className="mb-6 bg-gray-500 opacity-75 text-white">
//           <CardHeader className="rounded-t-lg">
//             <CardTitle className="text-2xl">Customer Survey Form</CardTitle>
//             <CardDescription className="text-blue-100">
//               Please fill out this form to help us serve you better. Page{" "}
//               {currentPage + 1} of {totalPages}.
//             </CardDescription>
//           </CardHeader>
//         </Card>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {currentQuestions.map((question, index) => (
//             <Card key={question.id}>
//               <CardHeader>
//                 <CardTitle className="text-lg">
//                   Question {currentPage * questionsPerPage + index + 1}
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>{renderQuestion(question)}</CardContent>
//             </Card>
//           ))}
//           <div className="flex justify-between pt-4">
//             {currentPage > 0 && (
//               <Button
//                 type="button"
//                 onClick={handleBack}
//                 className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2 text-lg"
//               >
//                 Back
//               </Button>
//             )}
//             {!isLastPage ? (
//               <Button
//                 type="button"
//                 onClick={handleNext}
//                 className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 text-lg"
//               >
//                 Next
//               </Button>
//             ) : (
//               <Button
//                 type="submit"
//                 className="bg-green-600 hover:bg-green  -700 text-white px-8 py-2 text-lg"
//               >
//                 Submit Survey
//               </Button>
//             )}
//           </div>
//         </form>

//         <div className="text-center mt-8 text-white text-sm z-50 bg-gray-500 opacity-75 p-4 rounded-lg">
//           <p>Thank you for taking the time to complete our survey!</p>
//         </div>
//       </div>
//     </div>
//   </div>
// );
// }

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

// Define question types (extensible for future types)
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
  | "multi_select_dropdown";

// Define question configuration structure
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
  const [questionIdMap, setQuestionIdMap] = useState<{ [key: string]: number }>(
    {}
  );
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 2;

  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true);
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_text, question_type, is_required");

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

        const mappedQuestions: Question[] = questionsData.map((q) => ({
          id: q.id.toString(),
          label: q.question_text,
          type: q.question_type as QuestionType,
          required: q.is_required,
          options: optionsData
            .filter((opt) => opt.question_id === q.id)
            .map((opt) => opt.option_text),
          placeholder:
            q.question_type === "textarea"
              ? "Write your response here..."
              : `Enter your ${q.question_type}`,
          rows: q.question_type === "textarea" ? 4 : undefined,
          min: q.question_type === "number" ? 1 : undefined,
          max: q.question_type === "number" ? 120 : undefined,
        }));

        setQuestions(mappedQuestions);

        const initialFormData = mappedQuestions.reduce((acc, q) => {
          if (q.type === "multi_select_dropdown") {
            acc[q.id] = { indicators: [], scores: {} };
          } else if (q.type === "checkbox") {
            acc[q.id] = [];
          } else {
            acc[q.id] = "";
          }
          return acc;
        }, {} as { [key: string]: string | string[] | { indicators: string[]; scores: { [key: string]: string } } });

        setFormData(initialFormData);

        const idMap = mappedQuestions.reduce((acc, q) => {
          acc[q.id] = Number.parseInt(q.id);
          return acc;
        }, {} as { [key: string]: number });

        setQuestionIdMap(idMap);
        console.log("mappedQuestions", questionIdMap);
        setMounted(true);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error("Error fetching data: " + errorMessage);
        setLoading(false);
      }
    }

    if (typeof window !== "undefined") {
      // Ensure client-side execution
      fetchQuestions();
    }
  }, []);

  const handleInputChange = (
    id: string,
    value:
      | string
      | string[]
      | { indicators: string[]; scores: { [key: string]: string } }
  ) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (typeof value === "string" && value === "Yes") {
      setShowExplanation((prev) => ({ ...prev, [id]: true }));
    } else if (typeof value === "string" && value === "No") {
      setShowExplanation((prev) => ({ ...prev, [id]: false }));
    }
  };
  const handleCheckboxChange = (
    id: string,
    value: string,
    checked: boolean
  ) => {
    setFormData((prev) => {
      const currentValues = (prev[id] as string[]) || [];
      return {
        ...prev,
        [id]: checked
          ? [...currentValues, value]
          : currentValues.filter((item) => item !== value),
      };
    });
  };


  const handleDropdownSelect = (id: string, selectedOption: string) => {
    setFormData((prev) => {
      const current = (prev[id] as {
        indicators: string[];
        scores: { [key: string]: string };
      }) || { indicators: [], scores: {} };

      // Check if option is already selected
      if (current.indicators.includes(selectedOption)) {
        return prev; // Don't add duplicates
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

  const getCurrentQuestions = () => {
    const start = currentPage * questionsPerPage;
    const end = start + questionsPerPage;
    return questions.slice(start, end);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage((prev) => prev + 1);
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: optionsData } = await supabase
        .from("question_options")
        .select("id, question_id, option_text");

      // const responses = questions.map((q) => {
      //   if (q.type === "multi_select_dropdown") {
      //     const current = formData[q.id] as {
      //       indicators: string[];
      //       scores: { [key: string]: string };
      //     };

      //     const selectedOptionIds = (optionsData ?? [])
      //       .filter(
      //         (opt) =>
      //           opt.question_id === Number.parseInt(q.id) &&
      //           current.indicators.includes(opt.option_text)
      //       )
      //       .map((opt) => opt.id);

      //     return {
      //       question_id: Number.parseInt(q.id),
      //       response_text:
      //         current.indicators.join(", ") +
      //         (Object.keys(current.scores).length
      //           ? ` (Scores: ${JSON.stringify(current.scores)})`
      //           : ""),
      //       response_option_ids:
      //         selectedOptionIds.length > 0 ? selectedOptionIds : null,
      //     };
      //   } else if (q.type === "checkbox") {
      //     const selectedOptionIds = (optionsData ?? [])
      //       .filter(
      //         (opt) =>
      //           opt.question_id === Number.parseInt(q.id) &&
      //           (formData[q.id] as string[]).includes(opt.option_text)
      //       )
      //       .map((opt) => opt.id);

      //     return {
      //       question_id: Number.parseInt(q.id),
      //       response_text: (formData[q.id] as string[]).join(", "),
      //       response_option_ids:
      //         selectedOptionIds.length > 0 ? selectedOptionIds : null,
      //     };
      //   } else if (q.type === "radio" || q.type === "dropdown") {
      //     const selectedOption = (optionsData ?? []).find(
      //       (opt) =>
      //         opt.question_id === Number.parseInt(q.id) &&
      //         opt.option_text === formData[q.id]
      //     );

      //     return {
      //       question_id: Number.parseInt(q.id),
      //       response_text: formData[q.id] as string,
      //       response_option_ids: selectedOption ? [selectedOption.id] : null,
      //     };
      //   } else {
      //     return {
      //       question_id: Number.parseInt(q.id),
      //       response_text: formData[q.id] as string,
      //       response_option_ids: null,
      //     };
      //   }
      // });

      const responses = questions.map((q) => {
        if (q.type === "multi_select_dropdown") {
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
          const selectedOptionIds = (optionsData ?? [])
            .filter(
              (opt) =>
                opt.question_id === parseInt(q.id) &&
                (formData[q.id] as string[]).includes(opt.option_text)
            )
            .map((opt) => opt.id);
          return {
            question_id: parseInt(q.id),
            response_text: (formData[q.id] as string[]).join(", "),
            response_option_ids:
              selectedOptionIds.length > 0 ? selectedOptionIds : null,
          };
        } else if (q.type === "radio") {
          const selectedOption = (optionsData ?? []).find(
            (opt) =>
              opt.question_id === parseInt(q.id) &&
              opt.option_text === formData[q.id]
          );
          const explanation = showExplanation[q.id]
            ? (formData[`${q.id}-explanation`] as string)
            : "";
          return {
            question_id: parseInt(q.id),
            response_text:
              (formData[q.id] as string) +
              (explanation ? ` (Explanation: ${explanation})` : ""),
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
        if (q.type === "multi_select_dropdown") {
          acc[q.id] = { indicators: [], scores: {} };
        } else if (q.type === "checkbox") {
          acc[q.id] = [];
        } else {
          acc[q.id] = "";
        }
        if (q.type === "radio" && showExplanation[q.id]) {
          acc[`${q.id}-explanation`] = "";
        }
        return acc;
      }, {} as { [key: string]: string | string[] | { indicators: string[]; scores: { [key: string]: string } } });
      setFormData(resetFormData);
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

      // case "radio":
      //   return (
      //     <div>
      //       <Label className="text-sm font-medium mb-3 block">
      //         {question.label} {question.required && "*"}
      //       </Label>
      //       <RadioGroup
      //         value={formData[question.id] as string}
      //         onValueChange={(value) => handleInputChange(question.id, value)}
      //         className="space-y-2"
      //       >
      //         {question.options?.map((option) => (
      //           <div key={option} className="flex items-center space-x-2">
      //             <RadioGroupItem value={option} id={`${question.id}-${option}`} />
      //             <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
      //           </div>
      //         ))}
      //       </RadioGroup>
      //     </div>
      //   )
      //============================> Above handle only handle but below code i write that open an explanation code <=================
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
            </div>
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

            {/* Dropdown for selecting indicators */}
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

            {/* Selected indicators with scores */}
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

            {/* Show remaining unselected options in a collapsed view */}
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
    <>
    <div
      className="min-h-screen py-8 px-4 survey-background"
    >
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
          <Card className="mb-6 bg-gray-500  text-white">
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
    </>
  );
}
