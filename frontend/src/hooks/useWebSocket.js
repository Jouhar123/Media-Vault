import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';
import toast from 'react-hot-toast';

const useWebSocket = () => {
  const ws = useRef(null);
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      ws.current.send(JSON.stringify({ type: 'AUTH', userId: user._id }));
    };

    ws.current.onmessage = (event) => {
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
          case 'AUTH_SUCCESS':
            console.log('WS auth confirmed');
            break;
          default:
            break;
        }
      } catch (e) { /* ignore */ }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 5s...');
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, [isAuthenticated, user, dispatch]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return ws;
};

export default useWebSocket;
