FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN pip install -r requirements.txt

# Expose the correct port
EXPOSE 8000

# Run the Flask app on 0.0.0.0
CMD ["flask", "run", "--host=0.0.0.0", "--port=8000"]