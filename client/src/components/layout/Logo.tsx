import logoImage from 'figma:asset/5ff5440abe51b7b7b5cb5d59139c39d7bdcbc7b3.png';

export const Logo = () => {
  return (
    <img 
      src={logoImage} 
      alt="BFFlix Logo" 
      className="h-12 w-auto"
    />
  );
};
