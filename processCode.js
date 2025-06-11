import * as espree from "espree";
import fs from "fs";
// import util from "util";
// import escodegen from "escodegen";
import neo4j from "neo4j-driver";
import axios from "axios";

try {
    const code = fs.readFileSync("./code/fibonacci.js");
    const tokens = espree.tokenize(code);
    const ast = espree.parse(code);

    const options = {
        depth: null,
        colors: true,
        maxArrayLength: null
    };

    // const generatedCode = escodegen.generate({
    //     type: 'BinaryExpression',
    //     operator: '-',
    //     left: {type: 'Literal', value: 25},
    //     right: {type: 'Literal', value: 10},
    // })

    // console.log(util.inspect(tokens, options));
    // console.log(util.inspect(ast, options));

    // console.log(generatedCode);

    const driver = neo4j.driver('bolt://neo4j:7687', neo4j.auth.basic('neo4j', 'strongpassword123'));
    const session = driver.session();


    // Delete all nodes
    await session.run(`MATCH (n) DETACH DELETE n`);

    console.log("deleted all nodes");
    
    let nodeId = 0;
    
    // Recursively traverse the AST and create nodes/relationships
    async function traverse(node, parentId = null) {
      const currentId = nodeId++;
      const type = node.type;


    
      // Create the AST node in Neo4j
      await session.run(
        `CREATE (n:ASTNode {id: $id, type: $type, raw: $raw})`,
        {
          id: currentId,
          type,
          raw: JSON.stringify(node, null, 2).slice(0, 1000), // limit large data
        }
      );
    
      // If there's a parent, create a relationship
      if (parentId !== null) {
        await session.run(
          `MATCH (p:ASTNode {id: $parentId}), (c:ASTNode {id: $childId})
           CREATE (p)-[:CHILD]->(c)`,
          {
            parentId,
            childId: currentId,
          }
        );
      }
    
      // Traverse child nodes
      for (const key in node) {
        if (typeof node[key] === 'object' && node[key] !== null) {
          if (Array.isArray(node[key])) {
            for (const child of node[key]) {
              if (child && typeof child.type === 'string') {
                await traverse(child, currentId);
              }
            }
          } else if (node[key].type) {
            await traverse(node[key], currentId);
          }
        }
      }
    }

        // Fetch a snippet of the AST from Neo4j
async function fetchASTSnippet() {
    const result = await session.run(`
        MATCH (N) RETURN N LIMIT 100;
    `);
  
    console.log(result);
  }
  
  async function analyzeAST() {
    const astText = await fetchASTSnippet();
  
    const prompt = `Analyze this abstract syntax tree structure and describe what code it likely represents:\n\n${astText}`;
  
    const res = await axios.post('http://localhost:11434/api/generate', {
      model: 'codellama',
      prompt: prompt,
      stream: false
    });
  
    console.log('\n--- Ollama Analysis ---\n');
    console.log(res.data.response);
  }
    
    (async () => {
      try {
        await traverse(ast);
        console.log('AST inserted into Neo4j!');
        // await analyzeAST();
      } catch (err) {
        console.error(err);
      } finally {
        await session.close();
        await driver.close();
      }
    })();
} catch (e) {
    console.log(e);
}