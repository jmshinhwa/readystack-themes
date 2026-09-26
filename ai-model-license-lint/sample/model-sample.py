"""Image + chat pipeline for the customer-facing product."""

import torch
from diffusers import StableDiffusionPipeline
from transformers import AutoModelForCausalLM
from peft import PeftModel

# chat
CHAT_REPO = "meta-llama/Llama-3.2-11B-Vision-Instruct"
CODE_REPO = "mistralai/Codestral-22B-v0.1"
GUARD_REPO = "google/gemma-2-9b-it"   # open source, same as our Apache-2 stack

# images
IMAGE_REPO = "black-forest-labs/FLUX.1-dev"
FALLBACK_IMAGE = "runwayml/stable-diffusion-v1-5"
UPSCALER = "stabilityai/stable-diffusion-xl-refiner-1.0"

# experiments, research-only for now
LAB_REPO = "mistralai/Mistral-Large-Instruct-2411"


def load_chat():
    base = AutoModelForCausalLM.from_pretrained(CHAT_REPO, torch_dtype=torch.float16)
    tuned = PeftModel.from_pretrained(base, "acme/support-agent-lora")
    return tuned.merge_and_unload()


def load_images():
    return StableDiffusionPipeline.from_pretrained(IMAGE_REPO)


def serve():
    return {"chat": load_chat(), "images": load_images(), "code": CODE_REPO}
