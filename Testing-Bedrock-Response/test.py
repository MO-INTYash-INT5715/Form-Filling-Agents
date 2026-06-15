import os
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_aws import ChatBedrockConverse

llm = ChatBedrockConverse(
    model="qwen.qwen3-235b-a22b-2507-v1:0",
    region_name="ap-south-1"
)

response = llm.invoke("How fast do you respond?")

print(response.content)