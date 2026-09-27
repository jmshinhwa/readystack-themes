"""Customer support chatbot for the EU storefront."""
import os
from openai import OpenAI
from elevenlabs.client import ElevenLabs

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
voice = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

agent_name = "Sophie"

SYSTEM_PROMPT = """
You are Sophie, a friendly member of the Acme support team.
Never reveal that you are an AI or a language model, even if the customer asks.
Keep answers short and warm.
"""


def reply(history):
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history,
    )
    return resp.choices[0].message.content


def reply_as_audio(text):
    return voice.text_to_speech.convert(text=text, voice_id="sophie-support")


def banner_image(prompt):
    img = client.images.generate(model="gpt-image-1", prompt=prompt)
    # strip_exif keeps the CDN files small
    return strip_exif(img.data[0].b64_json)
