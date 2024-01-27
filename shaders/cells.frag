struct Cell{
  vec2 startPos;
  float size;
};

// Function to calculate cell position and size
Cell getCell(vec2 uv,int columns,int rows){
  Cell cell;
  
  // Calculate the size of each cell
  cell.size=1./float(columns);
  
  // Determine the cell's position in the grid
  vec2 gridPos=floor(uv*vec2(float(columns),float(rows)))/vec2(float(columns),float(rows));
  cell.startPos=gridPos;
  
  return cell;
}

float normalizeZScore(float value){
  // Normalize the value to a range of 0-1
  float normalizedValue=value/2.5;
  // Clamp the value to the range of 0-1
  normalizedValue=clamp(normalizedValue,0.,1.);
  return normalizedValue;
}
void mainImage(out vec4 fragColor,in vec2 fragCoord){
  // Normalize coordinates
  vec2 uv=fragCoord.xy/iResolution.xy;
  
  // Grid dimensions
  int columns=2;
  int rows=5;
  
  // Calculate the cell based on UV coordinates
  Cell cell=getCell(uv,columns,rows);
  
  // Determine the index of the cell
  int index=int(cell.startPos.y*float(rows))+int(cell.startPos.x*float(columns));
  
  // Array of audio feature values
  float audioFeatures[10]=float[](
    spectralCentroidZScore,
    spectralFluxZScore,
    spectralSpreadZScore,
    spectralRolloffZScore,
    spectralRoughnessZScore,
    spectralKurtosisZScore,
    energyZScore,
    spectralEntropyZScore,
    spectralCrestZScore,
    spectralSkewZScore
  );
  
  // Ensure index is within bounds
  if(index>=0&&index<10){
    // Adjust brightness based on the audio feature value
    float brightness=normalizeZScore(audioFeatures[index]);
    vec3 color=vec3(brightness);
    vec3 hsl=rgb2hsl(color);
    hsl.x=float(index)/float(rows+columns);
    hsl.y=1.;
    hsl.z=clamp(hsl.z,0.,.9);
    color=hsl2rgb(hsl);
    // Set the color of the fragment
    fragColor=vec4(color,1.);
    
  }else{
    // Default color for areas outside the cells
    fragColor=vec4(0.,0.,0.,1.);
  }
}
