Local Setup

`docker-compose up --build`

Download `tinyllama` model

`docker exec -it ollama ollama pull tinyllama`

Process code in `code` directory into Neo4j database

`docker-compose exec node-app npm run process_code`

Send code to be analyzed by the LLM

`docker-compose exec node-app npm run analyze_code`