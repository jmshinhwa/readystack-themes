"""Thin wrapper around the LLM vendors our support bot calls."""
import os

import anthropic
import openai

SUMMARY_MODEL = "claude-3-5-sonnet-20241022"
TRIAGE_MODEL = "claude-3-haiku-20240307"
FALLBACK_MODEL = "gpt-4-turbo"
TRANSCRIBE_MODEL = "whisper-1"

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def summarize(ticket_text: str) -> str:
    msg = anthropic_client.messages.create(
        model=SUMMARY_MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": f"Summarize this ticket:\n{ticket_text}"}],
    )
    return msg.content[0].text


def transcribe(path: str) -> str:
    with open(path, "rb") as audio:
        return openai_client.audio.transcriptions.create(model=TRANSCRIBE_MODEL, file=audio).text


def fallback_answer(question: str) -> str:
    resp = openai_client.chat.completions.create(
        model=FALLBACK_MODEL,
        messages=[{"role": "user", "content": question}],
    )
    return resp.choices[0].message.content
