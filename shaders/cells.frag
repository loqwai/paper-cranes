struct Cell{
  vec2 startPos;
  float size;
};

// Function to calculate cell position and size
Cell getCell(vec2 uv,int gridDimension,int subdivisions){
  Cell cell;
  
  // Calculate the size of each cell
  float cellSize=1./float(gridDimension);
  
  // Determine the cell's position in the grid
  vec2 gridPos=floor(uv*float(gridDimension))/float(gridDimension);
  
  // If subdivisions are required
  if(subdivisions>1){
    // Calculate the size of each sub-cell
    float subCellSize=cellSize/float(subdivisions);
    
    // Adjust UV coordinates for the sub-grid
    vec2 subGridUV=fract(uv*float(gridDimension))*float(subdivisions);
    
    // Determine the position of the sub-cell
    vec2 subGridPos=floor(subGridUV)/float(subdivisions);
    
    // Set the cell's properties to match the sub-cell
    cell.startPos=gridPos+subGridPos*cellSize;
    cell.size=subCellSize;
  }else{
    // Set the cell's properties for the base case
    cell.startPos=gridPos;
    cell.size=cellSize;
  }
  
  return cell;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  // Normalize coordinates
  vec2 uv=fragCoord.xy/iResolution.xy;
  
  // Main grid dimensions
  int mainGridDimension=2;// 2x2 grid
  
  // Define a color for demonstration
  vec3 color=vec3(0.);
  
  // Main grid cell
  Cell mainCell=getCell(uv,mainGridDimension,1);
  
  // Recursive subdivision in some cells
  if(mainCell.startPos.x<.5&&mainCell.startPos.y<.5){
    // Subdivide the top-left cell into a smaller 3x3 grid
    Cell subCell=getCell(uv,mainGridDimension*3,3);
    
    // Color assignment for the sub-grid
    if(mod(subCell.startPos.x+subCell.startPos.y,subCell.size*2.)<subCell.size){
      color=vec3(1.,0.,0.);// Red
    }else{
      color=vec3(0.,0.,1.);// Blue
    }
  }else{
    // Color assignment for the main grid
    if(mod(mainCell.startPos.x+mainCell.startPos.y,mainCell.size*2.)<mainCell.size){
      color=vec3(0.,1.,0.);// Green
    }else{
      color=vec3(1.,1.,0.);// Yellow
    }
  }
  
  // Output color
  fragColor=vec4(color,1.);
}
