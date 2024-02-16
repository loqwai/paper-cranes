uniform float random;
float rnd(vec2 st){
  //rotate st by time
    st=vec2(st.x*cos(random)-st.y*sin(random),
    st.x*sin(random)+st.y*cos(random));
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 11118.5453123);
}
    void mainImage(out vec4 fragColor,in vec2 fragCoord)
    {
      vec2 uv=fragCoord/iResolution.xy;
      float r=rnd(uv);
      fragColor=vec4(r,r,r,1.0);
    }
