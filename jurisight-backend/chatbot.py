from flask import Flask, request, jsonify
from llama_index.core import VectorStoreIndex
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.groq import Groq
from llama_index.vector_stores.pinecone import PineconeVectorStore
from pinecone import Pinecone
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
Settings.llm = Groq(model="llama3-8b-8192", api_key=os.getenv("GROQ_API_KEY"))

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index("llamaindex")

vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
query_engine = index.as_query_engine()

app = Flask(__name__)
CORS(app)

@app.route('/chat', methods=['POST'])
def chat():
    try:
        if not request.json or 'message' not in request.json:
            return jsonify({"error": "Invalid request format"}), 400

        user_message = request.json['message']
        response = query_engine.query(user_message)
        response = {"response": f"{response}"}
        return jsonify(response), 200
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
