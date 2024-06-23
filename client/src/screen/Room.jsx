import { useSocket } from "../context/SocketProvider";
import { useCallback, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../services/peer";
import "./room.css";
const Room = () => {
  const socket = useSocket();
  const [remotesocketId, setremotesocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room  with id ${id}`);
    setremotesocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remotesocketId, offer });
    setMyStream(stream);
  }, [remotesocketId, socket]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setremotesocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming call from`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log(`Call accepted from`, from);
      sendStreams();
    },
    [sendStreams]
  );

  //for negotiation
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remotesocketId });
  }, [remotesocketId, socket]);

  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      peer.setLocalDescription(offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("Got tracks!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncoming,
    handleNegoFinal,
  ]);

  return (
    <div>
      <div className="upperSection">
        <h1>Room Page</h1>
        <h4>{remotesocketId ? "You are connected" : "NO ONE IN ROOM"}</h4>
        {myStream && <button onClick={sendStreams}>Send Stream</button>}
        {remotesocketId && <button onClick={handleCallUser}>CALL</button>}
      </div>
      <div className="videos">
        <div className="mediaContainer">
          {myStream && (
            <>
              <h4>My Stream</h4>
              <ReactPlayer
                playing
                muted
                height={"100%"}
                width={"100%"}
                url={myStream}
              />
            </>
          )}
        </div>
        <div className="mediaContainer">
          {remoteStream && (
            <>
              <h4>Remote Stream</h4>
              <ReactPlayer
                playing
                muted
                height={"100%"}
                width={"100%"}
                url={remoteStream}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
