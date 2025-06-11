Attempt automatically give a portion of a codebase to an LLM so that it can be analyzed and modified.

# LOCAL SETUP

1. Set up containers
```docker-compose up --build```

2. Download "tinyllama" model  
```docker exec -it ollama ollama pull tinyllama```

4. Process code in `code` directory into Neo4j database
```docker-compose exec node-app npm run process_code```

5. Send code to be analyzed by the LLM
```docker-compose exec node-app npm run analyze_code```
