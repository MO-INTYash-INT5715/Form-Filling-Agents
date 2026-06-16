import os
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_aws import ChatBedrockConverse

llm = ChatBedrockConverse(
    model="openai.gpt-oss-20b-1:0",
    region_name="ap-south-1"
)

response = llm.invoke("How fast do you respond?")

print(response.content)