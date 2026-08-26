import logging
import os
import json
from typing import Optional, Dict, Any, List
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """Reusable Backend Service for Google Gemini API Integrations."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    def _generate_with_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
        """Internal helper to call Gemini API using google-genai SDK."""
        if not self.client:
            return None

        try:
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config if config else None
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API generation error: {e}")
            return None

    def explain_doubt(self, question: str, category: Optional[str] = None) -> Dict[str, Any]:
        """Explain an academic doubt with structured sections."""
        system_instruction = "You are an expert computer science and engineering professor assisting B.Tech students. Provide clear, well-structured academic explanations with bullet points and practical examples."
        prompt = f"Subject/Category: {category or 'General Engineering'}\nStudent Doubt: {question}\n\nProvide a comprehensive, easy-to-understand explanation."

        ai_output = self._generate_with_gemini(prompt, system_instruction)
        if ai_output:
            return {"source": "gemini", "explanation": ai_output}

        return {
            "source": "fallback",
            "explanation": f"💡 Academic Explanation for '{question}':\n\n1. Core Concept:\n• {question} is a fundamental concept in {category or 'Engineering'}.\n• Key Principle: Focuses on optimizing system throughput, state isolation, and reliability.\n\n2. Key Takeaways:\n• Important for viva exams and technical interviews.\n• Ensure clear separation between interface contracts and data storage mechanisms."
        }

    def improve_answer(self, question: str, raw_answer: str) -> Dict[str, Any]:
        """Refine and enrich a student community answer."""
        system_instruction = "You are an academic editor. Improve the provided student answer by enhancing technical accuracy, formatting with bullet points, and adding exam-relevant keywords."
        prompt = f"Question: {question}\nOriginal Answer: {raw_answer}\n\nPlease output an improved, polished academic version of this answer."

        ai_output = self._generate_with_gemini(prompt, system_instruction)
        if ai_output:
            return {"source": "gemini", "improved_answer": ai_output}

        return {
            "source": "fallback",
            "improved_answer": f"✨ Refined & Enhanced Answer:\n{raw_answer}\n\n📌 Key Technical Notes:\n• Enhanced technical terminology for B.Tech evaluations.\n• Clarified performance implications and architectural benefits."
        }

    def summarize_pdf_content(self, filename: str, text: str) -> Dict[str, Any]:
        """
        Generate structured academic PDF summary containing:
        - Overview
        - Key Concepts
        - Important Points
        - Short Conclusion
        """
        system_instruction = (
            "You are an academic study assistant. Analyze the extracted text from a course document and "
            "generate a structured summary formatted precisely into four sections:\n"
            "1. OVERVIEW: A high-level 2-3 sentence overview of the document.\n"
            "2. KEY CONCEPTS: Bullet points explaining the main topics and definitions.\n"
            "3. IMPORTANT POINTS: Critical takeaways for exams, vivas, and lab practicals.\n"
            "4. SHORT CONCLUSION: A concise concluding summary sentence."
        )

        prompt = f"Document Filename: {filename}\nExtracted Text:\n{text[:8000]}\n\nPlease generate a structured academic summary."

        ai_output = self._generate_with_gemini(prompt, system_instruction)
        if ai_output:
            return {"source": "gemini", "summary": ai_output}

        fallback_summary = (
            f"📄 AI Academic Summary for '{filename}'\n\n"
            f"1. OVERVIEW:\n"
            f"This study material covers foundational concepts and practical principles discussed in {filename}.\n\n"
            f"2. KEY CONCEPTS:\n"
            f"• Core Architecture: System design and modular component breakdown.\n"
            f"• Operational Workflow: High-level data processing and interface contracts.\n\n"
            f"3. IMPORTANT POINTS:\n"
            f"• Key Exam Focus: Remember definitions, architectural diagrams, and trade-offs.\n"
            f"• Performance & Efficiency: Consider latency, scalability, and error recovery.\n\n"
            f"4. SHORT CONCLUSION:\n"
            f"Essential reading for B.Tech coursework and practical lab implementations."
        )
        return {"source": "fallback", "summary": fallback_summary}

    def generate_quiz_from_text(self, title: str, text: str, num_questions: int = 5) -> Dict[str, Any]:
        """
        Generate a multiple-choice academic quiz from text content using Gemini API.
        Validates output to ensure strict JSON structure.
        """
        system_instruction = (
            "You are an expert academic quiz generator for engineering students. "
            "Generate a JSON array of multiple choice questions based on the provided text. "
            "Respond ONLY with a valid raw JSON array and NO markdown codeblocks or conversational text.\n\n"
            "Required JSON Schema:\n"
            "[\n"
            "  {\n"
            '    "question": "Clear academic question text?",\n'
            '    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '    "correct_answer": 0,\n'
            '    "explanation": "Detailed explanation of why Option A is correct."\n'
            "  }\n"
            "]\n\n"
            "Rules:\n"
            "1. 'options' must be an array of EXACTLY 4 strings.\n"
            "2. 'correct_answer' must be an integer (0, 1, 2, or 3) representing the zero-indexed correct option.\n"
            "3. Provide clear explanations for viva and exam prep."
        )

        prompt = f"Quiz Title: {title}\nNum Questions: {num_questions}\nDocument Text:\n{text[:8000]}"

        ai_output = self._generate_with_gemini(prompt, system_instruction)
        if ai_output:
            try:
                cleaned_output = ai_output.strip()
                if cleaned_output.startswith("```json"):
                    cleaned_output = cleaned_output[7:]
                if cleaned_output.startswith("```"):
                    cleaned_output = cleaned_output[3:]
                if cleaned_output.endswith("```"):
                    cleaned_output = cleaned_output[:-3]
                cleaned_output = cleaned_output.strip()

                parsed_json = json.loads(cleaned_output)
                if isinstance(parsed_json, list) and len(parsed_json) > 0:
                    validated_questions = []
                    for q in parsed_json[:num_questions]:
                        if (
                            isinstance(q, dict) and
                            "question" in q and
                            "options" in q and
                            isinstance(q["options"], list) and
                            len(q["options"]) == 4 and
                            "correct_answer" in q and
                            isinstance(q["correct_answer"], int) and
                            0 <= q["correct_answer"] <= 3
                        ):
                            validated_questions.append({
                                "question": str(q["question"]),
                                "options": [str(opt) for opt in q["options"]],
                                "correct_answer": int(q["correct_answer"]),
                                "explanation": str(q.get("explanation", "Correct based on course study material."))
                            })

                    if len(validated_questions) > 0:
                        return {"source": "gemini", "questions": validated_questions}

            except Exception as e:
                logger.warning(f"Failed to parse Gemini JSON output for quiz generation: {e}")

        # Fallback Quiz Questions
        fallback_questions = [
            {
                "question": f"What is the primary architectural objective discussed in {title}?",
                "options": [
                    "Maximizing system throughput, state isolation, and reliability",
                    "Minimizing database indexing structures",
                    "Ignoring concurrent network connections",
                    "Bypassing authentication protocols"
                ],
                "correct_answer": 0,
                "explanation": "Optimizing throughput, state isolation, and reliability is the primary goal in modern systems design."
            },
            {
                "question": f"Which principle applies to data storage contracts in {title}?",
                "options": [
                    "Direct state mutation without verification",
                    "Decoupling interface contracts from underlying storage layers",
                    "Hardcoding static credentials in source code",
                    "Unencrypted open network socket transmission"
                ],
                "correct_answer": 1,
                "explanation": "Decoupling contracts from storage services enables seamless pluggable migrations (e.g. Local to AWS S3)."
            },
            {
                "question": f"How does modular error handling improve reliability in {title}?",
                "options": [
                    "By crashing the application process immediately",
                    "By catching exceptions and returning structured fallback responses",
                    "By swallowing exceptions without logging",
                    "By exposing private API keys in client bundles"
                ],
                "correct_answer": 1,
                "explanation": "Structured fallbacks ensure zero application downtime even during external service outages."
            },
            {
                "question": f"What is a key consideration for performance optimization in {title}?",
                "options": [
                    "Unlimited memory allocation",
                    "Capping extracted payload text length to prevent LLM prompt overflow",
                    "Running blocking infinite loops on main event threads",
                    "Disabling client CORS policies"
                ],
                "correct_answer": 1,
                "explanation": "Capping text lengths prevents prompt context overflow and minimizes processing latency."
            },
            {
                "question": f"Why is centralized activity logging essential for learning platforms like {title}?",
                "options": [
                    "To consume disk space inefficiently",
                    "To enable real-time learning analytics, streak tracking, and gamified XP rewards",
                    "To slow down database queries",
                    "To disable user authorization checks"
                ],
                "correct_answer": 1,
                "explanation": "Centralized logs power real-time analytics dashboards, XP points accrual, and leaderboard rankings."
            }
        ]
        return {"source": "fallback", "questions": fallback_questions[:num_questions]}

    def generate_flashcards_from_text(self, title: str, text: str, num_cards: int = 10) -> Dict[str, Any]:
        """
        Generate academic study flashcards (front/question, back/answer, topic) from text content using Gemini API.
        Validates output to ensure strict JSON structure.
        """
        system_instruction = (
            "You are an academic flashcard generator for computer science and engineering students. "
            "Generate a JSON array of flashcards based on the provided course material. "
            "Respond ONLY with a valid raw JSON array and NO markdown codeblocks or conversational text.\n\n"
            "Required JSON Schema:\n"
            "[\n"
            "  {\n"
            '    "front": "Clear concept term or question?",\n'
            '    "back": "Concise, highly educational answer or definition.",\n'
            '    "topic": "Core Subject Topic"\n'
            "  }\n"
            "]\n\n"
            "Rules:\n"
            "1. Focus on key definitions, architectural patterns, and exam formulas.\n"
            "2. Keep 'back' answers concise yet comprehensive for quick revision.\n"
            "3. Avoid duplicate or trivial flashcards."
        )

        prompt = f"Flashcard Set Title: {title}\nNum Flashcards: {num_cards}\nCourse Text:\n{text[:8000]}"

        ai_output = self._generate_with_gemini(prompt, system_instruction)
        if ai_output:
            try:
                cleaned_output = ai_output.strip()
                if cleaned_output.startswith("```json"):
                    cleaned_output = cleaned_output[7:]
                if cleaned_output.startswith("```"):
                    cleaned_output = cleaned_output[3:]
                if cleaned_output.endswith("```"):
                    cleaned_output = cleaned_output[:-3]
                cleaned_output = cleaned_output.strip()

                parsed_json = json.loads(cleaned_output)
                if isinstance(parsed_json, list) and len(parsed_json) > 0:
                    validated_cards = []
                    for card in parsed_json[:num_cards]:
                        if (
                            isinstance(card, dict) and
                            "front" in card and
                            "back" in card and
                            str(card["front"]).strip() and
                            str(card["back"]).strip()
                        ):
                            validated_cards.append({
                                "front": str(card["front"]).strip(),
                                "back": str(card["back"]).strip(),
                                "topic": str(card.get("topic", "General Engineering")).strip()
                            })

                    if len(validated_cards) > 0:
                        return {"source": "gemini", "flashcards": validated_cards}

            except Exception as e:
                logger.warning(f"Failed to parse Gemini JSON output for flashcard generation: {e}")

        # Structured Fallback Flashcards
        fallback_cards = [
            {
                "front": f"What is the core subject of '{title}'?",
                "back": "System architecture, modular decoupling, and high-performance cloud processing.",
                "topic": "System Design"
            },
            {
                "front": "What is the benefit of interface contract abstraction?",
                "back": "Allows underlying storage services (e.g. Local disk to AWS S3) to be swapped without modifying business logic.",
                "topic": "Architecture"
            },
            {
                "front": "Why is JSON output validation crucial for AI services?",
                "back": "Prevents client-side crashes by ensuring strict data schema compliance and graceful fallback handling.",
                "topic": "API Security"
            },
            {
                "front": "What is the role of WebSockets in collaborative platforms?",
                "back": "Enables bi-directional, full-duplex real-time communication for instant group chat and updates.",
                "topic": "Networking"
            },
            {
                "front": "How do centralized point ledgers enhance student motivation?",
                "back": "Rewards active learning activities (quizzes, resource uploads, planner completion) with XP on dynamic leaderboards.",
                "topic": "Gamification"
            }
        ]
        return {"source": "fallback", "flashcards": fallback_cards[:num_cards]}

# Global AI Service Instance
ai_service = AIService()
