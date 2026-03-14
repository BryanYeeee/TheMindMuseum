import requests
import openai
from config import OPENAI_API_KEY

_client = openai.OpenAI(api_key=OPENAI_API_KEY)


def generate_image(prompt: str, output_path: str) -> None:
    """Generate an image for an exhibit and save it to output_path."""
    full_prompt = (
        f"Museum exhibit artifact: {prompt}. "
        "Single isolated object on a pure white background. "
        "Professional museum photography, sharp detail, even lighting."
    )

    response = _client.images.generate(
        model="dall-e-3",
        prompt=full_prompt,
        size="1024x1024",
        quality="standard",
        response_format="url",
        n=1,
    )

    image_url = response.data[0].url
    img_response = requests.get(image_url, timeout=30)
    img_response.raise_for_status()

    with open(output_path, "wb") as f:
        f.write(img_response.content)
