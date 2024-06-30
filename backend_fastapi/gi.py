from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["X-Requested-With", "Content-Type"],
)


class ImagePrompt(BaseModel):
    prompt: str


@app.get("/generate-image/")
async def generate_image(prompt: str):
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        response = openai.Image.create(
            model="dall-e-3", prompt=prompt, size="1024x1024", quality="standard", n=1
        )
        image_url = response.data[0].url
        return {"image_url": image_url}
    except openai.error.OpenAIError as e:
        raise HTTPException(status_code=e.http_status, detail=str(e))
