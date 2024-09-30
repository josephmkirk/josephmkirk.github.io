let width;
let height;

let step_size = 0.8;
let shape_freq = 8;
let counter = 0;

let node_ID_counter = 1;
let edge_ID_counter = 1;
let nodes = {};
let edges = {};

let cycles = []
let sections = []

let allow_spin = true;

let click1_flag = false;
let click1_pos;
let click1_edge_ID;
let click1_cycles;
let RT_closest_point;
let RT_closest_point_edge_ID;

let lightMode = true; 
let strokeColour;
let fillColour;

function setup() {
    
    let navbarHeight = document.getElementById('main-navbar').offsetHeight;
    width = document.getElementById('canvas-container').clientWidth;
    height = windowHeight - navbarHeight;

    let canvas = createCanvas(width, height);
    canvas.parent('canvas-container');
    console.log(navbarHeight);

    // Adjust the div container height
    // document.getElementById('canvas-container').style.height = canvasHeight + 'px';


    // Setup inital square
    // Corner point objects
    //  2 ----- 3
    //  |       |
    //  1 ----- 4

    new Node(createVector(0,0));
    new Node(createVector(0, height));
    new Node(createVector(width, height));
    new Node(createVector(width, 0));

    cycles.splice(0,0,[1,2,3,4]);

    // |: left side
    new Edge(nodes[1], nodes[2]);
    // |: right side
    new Edge(nodes[4], nodes[3]);
    // -: top side
    new Edge(nodes[2], nodes[3]);
    // -:  bottom side
    new Edge(nodes[1], nodes[4]);

    new Section(cycles[0]);

    noFill();
}

function draw() {
    
    translate(0, height);  //moves the origin to bottom left
    scale(1, -1);          //flips the y values so y increases "up"
    
    
    if (lightMode) {
        strokeColour = 0;
        fillColour = 255;
    } else {
        strokeColour = 255;
        fillColour = 0;
    }

    stroke(strokeColour);
    background(fillColour);
    
    // Draw all edges
    for (let key in edges) {
        edges[key].draw()
    }

    // line(0,0,0,height);
    // line(0,0,width,0);
    // line(width,0,width,height);
    // line(0,height,width,height);

    [RT_closest_point_edge_ID, RT_closest_point] = search_for_closest_edge_to(createVector(mouseX, height-mouseY));
    
    fill(fillColour);
    stroke(strokeColour);
    ellipse(RT_closest_point.x, RT_closest_point.y, 10,10); 
    noFill();

    for (let section of sections) {
        if (allow_spin) {
            if (counter == shape_freq) {
                // Add new shape
                section.create_shape();
            }
            section.update_shapes();    
        }
        
        section.draw();
    }   

    if (click1_flag) {
        stroke(255,0,0);
        line(click1_pos.x, click1_pos.y, RT_closest_point.x, RT_closest_point.y);
        stroke(strokeColour);
    }
    if (counter == shape_freq) {
        counter = 0;
    } else {
        counter++;
    }

}

// Constructor function for Node object
function Node(pos) {
    this.ID = node_ID_counter;
    node_ID_counter++;

    this.x = pos.x;
    this.y = pos.y;
    this.connection_map = [];

    nodes[this.ID] = this;

    this.get_pos = function(){
        return createVector(this.x, this.y);
    }

    this.delete_from_connection_map = function(ID) {
        // Get index of value in connection map
        let idx = this.connection_map.indexOf(ID);
        this.connection_map.splice(idx, 1);
    }

}

// Constructor function for Edge object
function Edge(n1,n2) {
    this.ID = edge_ID_counter;
    edge_ID_counter++;

    this.n1ID = n1.ID;
    this.n2ID = n2.ID;
    this.p1 = n1.get_pos();
    this.p2 = n2.get_pos();

    this.m = p5.Vector.sub(this.p1, this.p2);
    this.m.normalize();

    n1.connection_map.push(this.n2ID);
    n2.connection_map.push(this.n1ID);

    edges[this.ID] = this;

    this.draw = function() {
        stroke(strokeColour);
        line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }

    // Find the closest point on the seperator to the point pt
    this.find_closest_point_to = function(pt){
        let x1 = this.p1.x, y1 = this.p1.y;
        let x2 = this.p2.x, y2 = this.p2.y;
        let px = pt.x, py = pt.y;

        // Calculate direction vector of the line
        let dx = x2 - x1;
        let dy = y2 - y1;
        
        // Calculate the vector from A to P
        let px1 = px - x1;
        let py1 = py - y1;
        
        // Calculate the dot product of the direction vector and the vector from A to P
        let dotProduct = dx * px1 + dy * py1;
        
        // Calculate the length squared of the direction vector
        let lineLengthSquared = dx * dx + dy * dy;
        
        // Calculate the projection factor
        let t = dotProduct / lineLengthSquared;

        t = constrain(t,0,1);
        
        // Calculate the intersection point
        let intersectionX = x1 + t * dx;
        let intersectionY = y1 + t * dy;
        
        return createVector(intersectionX, intersectionY);
    }

    this.find_cycles = function() {
        let member_cycles = new Set();
        for (let cycle of cycles) {
            if (cycle.includes(this.n1ID) && cycle.includes(this.n2ID)) {
                member_cycles.add(cycle);
            }
        }
        return member_cycles;
    }

}

function Section(cycle) {
    this.shapes = [];
    this.cycle = cycle;
    this.spin = Math.random() < 0.5 ? -1 : 1;

    this.create_shape = function() {
        let corners = [];
        for (let i=0; i<this.cycle.length; i++) {
            corners.push(nodes[this.cycle[i]].get_pos());
        }
        this.shapes.push(corners);
    }

    this.update_shapes = function() {
        // Advance shape along the curve
        for (let s=this.shapes.length-1; s>=0; s--) {
            for (let i=0; i < this.shapes[s].length; i++) {
                // Decide spin of section
                let next_index = i + this.spin;
                if (next_index == -1) {
                    next_index += this.shapes[s].length;
                } else if (next_index == this.shapes[s].length) {
                    next_index = 0;
                }
                let next_point = this.shapes[s][next_index]; // The next point in the array
                let direction = p5.Vector.sub(next_point, this.shapes[s][i]); // Vector towards the next point

                direction.normalize(); // Convert to unit vector
                direction.mult(step_size); // Scale for smoother movement

                this.shapes[s][i].add(direction); // Update the point's position
            }

            if (p5.Vector.dist(this.shapes[s][0], this.shapes[s][1]) < 1) {
                this.shapes.splice(s, 1);
            }
        }
    }

    this.draw = function() {
        for (let s=this.shapes.length-1; s>=0; s--) {
            // Draw the current position of the shape
            beginShape();
            for (let i=0; i < this.shapes[s].length; i++) {
                vertex(this.shapes[s][i].x, this.shapes[s][i].y);
            }
            endShape(CLOSE); // Closes the shape between the last and first points
        }
    }

    sections.push(this);

}

// Find the closest seperator to the point pt and return it's index in the array edges
function search_for_closest_edge_to(pt) {
    // Linear Search
    let closest_dist = Infinity;
    let closest_point = null;
    let closest_ID = null;

    for (let key in edges) {
        let new_point = edges[key].find_closest_point_to(pt);
        let new_dist = Math.sqrt((pt.x - new_point.x)**2 + (pt.y - new_point.y)**2);

        if (new_dist < closest_dist) {
            closest_dist = new_dist;
            closest_ID = key;
            closest_point = new_point;
        } 
    }
    return [closest_ID, closest_point];
}

function print_cycles() {
    console.log("CYCLES");
    for (let i=0; i<cycles.length; i++) {
        console.log(cycles[i]);
    }
}

function mouseClicked() {

    if (click1_flag) {
        let click2_cycles = edges[RT_closest_point_edge_ID].find_cycles();
        let hasCommonElement = [...click1_cycles].some(item => click2_cycles.has(item));
        if (click1_edge_ID != RT_closest_point_edge_ID && hasCommonElement) {

            // First we need to insert the new nodes at either end of the new line
            // (So this x2)
            function insert_node(point, edgeID) {
                // - Splice out old edge
                let old_edge = edges[edgeID];

                // Get adjoining nodes
                let n1ID = old_edge.n1ID;
                let n2ID = old_edge.n2ID;

                delete edges[edgeID]

                // Delete reference of direct connection between nodes either side
                nodes[n1ID].delete_from_connection_map(n2ID);
                nodes[n2ID].delete_from_connection_map(n1ID);
                
                // Insert new node at point
                node = new Node(point);

                // Add 2 new edges to connect up (updating connection map as well)                
                new Edge(nodes[n1ID], nodes[node.ID]);
                new Edge(nodes[n2ID], nodes[node.ID]);

                // Update cycles
                // Find any cycle with old edge and update to include new intermediate node
                for (let i=0; i<cycles.length; i++) {
                    // Was the old edge in the cycle
                    if (cycles[i].includes(n1ID) && cycles[i].includes(n2ID)) {
                        let n1Pos = cycles[i].indexOf(n1ID);
                        let n2Pos = cycles[i].indexOf(n2ID);

                        // Find position in list and add new node accordingly
                        // Edge case of node lying between end and start
                        if (n1Pos == 0 && n2Pos == cycles[i].length-1) {
                            cycles[i].splice(n1Pos,0,node.ID);
                        } else if (n2Pos == 0 && n1Pos == cycles[i].length-1) {
                            cycles[i].splice(n2Pos,0,node.ID);
                        } else if (n1Pos < n2Pos) {
                            cycles[i].splice(n2Pos,0,node.ID);
                        } else {
                            cycles[i].splice(n1Pos,0,node.ID);
                        }
                    }
                }

                return node.ID;
            }

            let n1ID = insert_node(click1_pos, click1_edge_ID);
            let n2ID = insert_node(RT_closest_point, RT_closest_point_edge_ID);
            
            // Then add in the edge connecting the 2 new nodes
            new Edge(nodes[n1ID], nodes[n2ID]);


            // Seperate the cycles along the edge
            // Find cycle with new edge on it
            for (let i=cycles.length-1; i>=0; i--) {
                if (cycles[i].includes(n1ID) && cycles[i].includes(n2ID)) {
                    let n1Pos = cycles[i].indexOf(n1ID);
                    let n2Pos = cycles[i].indexOf(n2ID);

                    // Find position in list and add new node accordingly
                    if (n1Pos < n2Pos) {
                        let middle = cycles[i].splice(n1Pos+1,n2Pos-n1Pos-1);
                        middle.unshift(n1ID);
                        middle.push(n2ID);
                        cycles.push(middle);
                        new Section(middle);
                    } else {
                        let middle = cycles[i].splice(n2Pos+1,n1Pos-n2Pos-1);
                        middle.unshift(n2ID);
                        middle.push(n1ID);
                        cycles.push(middle);
                        new Section(middle);
                    }
                }
            }

            click1_flag = false;
        }
    } else {
        click1_pos = RT_closest_point;
        click1_edge_ID = RT_closest_point_edge_ID;
        click1_flag = true;
        click1_cycles = edges[click1_edge_ID].find_cycles();
    }
    console.log(sections);
}

function keyPressed() {
    // Space to pause
    if (key === ' ') {
        allow_spin = !allow_spin;

    // d to delete all shapes
    } else if (key === 'd' || key === 'D') {
        for (let i=0; i<sections.length; i++) {
            sections[i].shapes = [];
        } 
    
    // s to swap light and dark mode
    } else if (key === 's' || key === 'S') {
        lightMode = !lightMode;
    }

}