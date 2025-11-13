
  # Create Login/Sign-Up Page

  This is a code bundle for Create Login/Sign-Up Page. The original project is available at https://www.figma.com/design/9onCc73yjxIpf0pFmdXFo6/Create-Login-Sign-Up-Page.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Docker / Render deployment

  1. Ensure `VITE_API_URL` is set (e.g., in `.env`) before building.
  2. Build the container: `docker build -t bfflix-client .`
  3. Run locally: `docker run -p 4173:80 bfflix-client` and open `http://localhost:4173`.
  4. Alternatively, from the repo root run `docker-compose up --build client` to build and start the nginx container on `http://localhost:4173`.
  5. On Render, create a Web Service pointed at `client/`, select Docker as the environment, and Render will use the provided `Dockerfile` to build and serve the static site via nginx.
  
