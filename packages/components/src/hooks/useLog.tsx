import { useEffect } from 'react';

const useLog = (message: string) => {
  useEffect(() => {
    console.log(message);
  }, [message]);
};

export default useLog;