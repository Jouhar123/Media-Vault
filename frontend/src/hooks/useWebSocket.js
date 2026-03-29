import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

const useWebSocket = () => {
  const ws = useRef(null);
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const userIdRef = useRef(null);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    // 1. Auth Guard
    if (!isAuthenticated || !user?._id) {
      if (ws.current) ws.current.close(1000);
      return;
    }

    // 2. Identity Guard (Prevent redundant connections)
    if (userIdRef.current === user._id && ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    userIdRef.current = user._id;
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

    const connect = () => {
      if (!isMounted.current) return;

      // Cleanup existing before new attempt
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.onclose = null; 
        ws.current.close();
      }

      try {
        ws.current = new WebSocket(wsUrl);
      } catch (e) {
        console.error('WS Connection Error:', e);
        return;
      }

      ws.current.onopen = () => {
        if (!isMounted.current) return;
        ws.current.send(JSON.stringify({ type: 'AUTH', userId: userIdRef.current }));
      };

      ws.current.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'UPLOAD_SUCCESS':
              toast.success(data.message);
              dispatch(addNotification({ type: 'success', message: data.message, file: data.file }));
              break;
            case 'NEW_FILE':
              toast(`📁 ${data.file.uploader} uploaded "${data.file.name}"`, { icon: '🆕' });
              break;
            default:
              break;
          }
        } catch (err) { /* silent parse fail */ }
      };

      ws.current.onclose = (e) => {
        if (!isMounted.current || e.code === 1000 || !userIdRef.current) return;
        
        // Reconnect with 5s backoff
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.current.onerror = () => ws.current?.close();
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      userIdRef.current = null;
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close(1000);
      }
    };
  }, [isAuthenticated, user?._id, dispatch]);

  return ws;
};

export default useWebSocket;