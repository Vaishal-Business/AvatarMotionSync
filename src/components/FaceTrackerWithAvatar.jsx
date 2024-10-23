import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Euler, Matrix4 } from "three";

let video;
let faceLandmarker;
let lastVideoTime = -1;
let blendshapes = [];
let rotation;
let headMesh = [];
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

const options = {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
    delegate: "GPU",
  },
  numFaces: 1,
  runningMode: "VIDEO",
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
};



const FaceTrackerWithAvatar = () => {
  const [avatarUrl, setAvatarUrl] = useState("https://models.readyplayer.me/670fa6b5898f6508785ed627.glb")
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [landmarks, setLandmarks] = useState(null);
  const [error, setError] = useState(null);

  const setup = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      options
    );

    video = document.getElementById("video");
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      .then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predict);
      });
  };

  const predict = async () => {
    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const faceLandmarkerResult = faceLandmarker.detectForVideo(
        video,
        nowInMs
      );

      if (
        faceLandmarkerResult.faceBlendshapes &&
        faceLandmarkerResult.faceBlendshapes.length > 0 &&
        faceLandmarkerResult.faceBlendshapes[0].categories
      ) {
        blendshapes = faceLandmarkerResult.faceBlendshapes[0].categories;

        const matrix = new Matrix4().fromArray(
          faceLandmarkerResult.facialTransformationMatrixes[0].data
        );
        rotation = new Euler().setFromRotationMatrix(matrix);
      }
    }

    window.requestAnimationFrame(predict);
  };

  useEffect(() => {
    setup();
  }, []);


  
const Avatar = () => {
  const { scene } = useGLTF(`${avatarUrl}?morphTargets=ARKit`);
  scene.scale.set(3, 3);
  const { nodes } = useGraph(scene);

  useEffect(() => {
    if (nodes.Wolf3D_Head) headMesh.push(nodes.Wolf3D_Head);
    if (nodes.Wolf3D_Teeth) headMesh.push(nodes.Wolf3D_Teeth);
    if (nodes.Wolf3D_Beard) headMesh.push(nodes.Wolf3D_Beard);
    if (nodes.Wolf3D_Avatar) headMesh.push(nodes.Wolf3D_Avatar);
    if (nodes.Wolf3D_Head_Custom) headMesh.push(nodes.Wolf3D_Head_Custom);
  }, [nodes]);

  useFrame(() => {
    if (blendshapes.length > 0) {
      blendshapes.forEach((element) => {
        headMesh.forEach((mesh) => {
          let index = mesh.morphTargetDictionary[element.categoryName];
          if (index >= 0) {
            mesh.morphTargetInfluences[index] = element.score;
          }
        });
      });

      nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
      nodes.Neck.rotation.set(
        rotation.x / 5 + 0.3,
        rotation.y / 5,
        rotation.z / 5
      );
      nodes.Spine2.rotation.set(
        rotation.x / 10,
        rotation.y / 10,
        rotation.z / 10
      );
    }
  });

  return <primitive object={scene} position={[0, -5, 4]} />;
};

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{height: "92vh", display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "column"}}>
      <div style={{display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", width: "100%"}}>
        <h1 style={{fontFamily: "Arial, Helvetica, sans-serif"}}>Enter Avatar URL</h1>
        <input style={{width: "60%", height: "40px", padding: "8px", fontSize: "22px", fontWeight: "500"}} type="text" value={avatarUrl} onChange={(e) => {setAvatarUrl(e.target.value)}} />
      </div>
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <video
        id="video"
        ref={videoRef}
        style={{ display: "block", width: "50%" }}
        autoPlay
      />
      <canvas
        ref={canvasRef}
        width="50%"
        height={400}
        style={{
          position: "relative",
          top: "10px",
          left: "10px",
          zIndex: 10,
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 5] }}
        style={{
          position: "relative",
          top: 0,
          left: 0,
          width: "100%",
          height: "400px",
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight intensity={0.8} position={[5, 5, 5]} />
        <Avatar />
        <OrbitControls />
      </Canvas>
    </div>
    </div>
  );
};

export default FaceTrackerWithAvatar;
