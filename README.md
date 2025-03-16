Installation

# Clone repository
git clone https://github.com/yourusername/store-rating-app.git
cd store-rating-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Start development server
npm run dev
