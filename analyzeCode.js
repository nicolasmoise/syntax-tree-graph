import neo4j from "neo4j-driver";
import axios from "axios";

const driver = neo4j.driver('bolt://neo4j:7687', neo4j.auth.basic('neo4j', 'strongpassword123'));
const session = driver.session();

async function getASTJsonFromNeo4j(rootId = 0) {  
    try {
      // Recursive function to build the tree
      // TO-DO: make query more releavant to prompt
      // i.e. only insert such and such files or just fetch high-level nodes.
      const buildTree = async (id) => {
        const res = await session.run(
          `MATCH (n:ASTNode {id: $id})
           OPTIONAL MATCH (n)-[:CHILD]->(child)
           RETURN n, collect(child) as children`,
          { id }
        );
  
        if (res.records.length === 0) return null;
  
        const node = res.records[0].get('n').properties;
        const children = res.records[0].get('children').map(c => c.properties);
  
        const childTrees = [];
        for (const child of children) {
          const subtree = await buildTree(parseInt(child.id));
          if (subtree) childTrees.push(subtree);
        }
  
        return {
          id: parseInt(node.id),
          type: node.type,
          children: childTrees
        };
      };
  
      const tree = await buildTree(rootId);
      return tree;
  
    } catch (err) {
      console.error('Error building AST JSON:', err);
      return null;
    } finally {
      await session.close();
      await driver.close();
    }
  }

const result = await getASTJsonFromNeo4j();
console.log(result);

const llmResponse = await sendASTToOllama(result);
console.log(llmResponse);

/**
 * Sends a JSON AST to the local Ollama container for analysis.
 * @param {Object} astJson - The AST as JSON
 * @param {string} model - Name of the Ollama model (e.g. "mistral", "llama3")
 * @returns {Promise<string>} - The model's response
 */
async function sendASTToOllama(astJson, model = 'tinyllama') {
  const prompt = `
  You are a JavaScript code analyst. Here is a JSON representation of an Abstract Syntax Tree (AST) of some JavaScript code:

  ${JSON.stringify(astJson, null, 2)}
  
  Please provide a brief summary of what this code does, based on the AST structure.
  `;

  console.log(prompt);

  try {
    const response = await axios.post('http://ollama:11434/api/generate', {
      model,
      prompt,
      stream: false
    });

    return response.data.response;
  } catch (error) {
    console.error('Error sending AST to Ollama:', error);
    return null;
  }
}

