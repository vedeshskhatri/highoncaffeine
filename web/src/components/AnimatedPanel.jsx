import { motion } from 'framer-motion';

export default function AnimatedPanel({ children, delay = 0, style, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
