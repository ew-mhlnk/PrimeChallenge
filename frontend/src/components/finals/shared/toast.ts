import toast from 'react-hot-toast';

const style = {
  background: '#f4ecff',
  color: '#1b0029',
  fontSize: '12px',
  fontWeight: 700,
  borderRadius: '12px',
};

export const finalsToast = (message: string) => toast(message, { style, duration: 2200 });
export const finalsToastError = (message: string) => toast.error(message, { style, duration: 2600 });
