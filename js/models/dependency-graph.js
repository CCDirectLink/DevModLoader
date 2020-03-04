function TopologicalSortHelper(node, nodes, visited, stack) {
    if (!visited[node.name]) {
        visited[node.name] = true;
        const nodeIndex = nodes.indexOf(node);
        nodes.splice(nodeIndex, 1);

        for (const depKey of Object.keys(node.dependent)) {
            TopologicalSortHelper(node.dependent[depKey] ,nodes, visited, stack);
        }

        stack.push(node);
    }
}

export default class DependencyGraph {
    constructor() {
        this.nodes = [];
        this.names = {};
    }

    addNode(node) {
        this.nodes.push(node);
        this.names[node.name] = node;
    }

    sort() {
        const visited = {};
        const stack = [];
        const unvisitedNodes = this.nodes.slice(0);

        while (unvisitedNodes.length > 0) {
            TopologicalSortHelper(unvisitedNodes[0], unvisitedNodes, visited, stack);
        }
        
        this.nodes.splice(0);
        this.nodes.push(...stack.reverse());
    }

    getNodes() {
        return this.nodes;
    }

    reset() {
        this.names = {};
        this.nodes.splice(0).map(e => e.reset());
    }

    hasNode(name) {
        for(const node of this.nodes) {
            if (node.name === name) {
                return true;
            }
        }
        return false;
    }
}