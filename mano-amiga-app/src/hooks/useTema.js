import { useContext } from 'react';
import { TemaContext } from '../context/TemaContext';

export const useTema = () => useContext(TemaContext);
