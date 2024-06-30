uvicorn gi:app --reload

npm start


The command to run the backend:
1) install the dependencies
pip install -r requirements.txt
* create .env file in the backend folder containing the open ai api key for image generation:
OPENAI_API_KEY=YOUR_API_KEY
2) run the backend server
uvicorn gi:app --reload

For the frontend you should run:
npm install
npm start