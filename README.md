# How to Set Up and Run the Project

1. **Install Docker**
   - Download and install Docker from [Docker's official website](https://www.docker.com/).

2. **Clone the Repository**
   - Clone the repository to your local machine using Git:

3.**Install Dependencies**
   - If needed,install the dependencies with npm using:
     ```bash
     npm install --force
     ```   

4. **Build the Docker Image**
   - Open a terminal in VS Code and run the following command to build the Docker image:
     ```bash
     docker build -t vid-conferencing-final .
     ```

5. **Compose Up the Container**
   - Use Docker Compose to build and run the container:
     ```bash
     docker-compose up --build
     ```

6. **Start the Application**
   - Open another terminal and navigate to the project directory, then run:
     ```bash
     npm start
     ```

7. **Access the Application**
   - Open your web browser and go to `http://localhost:3000` to view the application.
