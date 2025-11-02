
// Allow importing plain CSS (side-effect or as a module)
declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

// (optional) Common asset types CRA imports:
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";