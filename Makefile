BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 5000

.PHONY: install-backend install-frontend run-backend run-frontend db-setup

install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

run-backend:
	cd backend && PORT=$(BACKEND_PORT) npm run dev

run-frontend:
	$(if $(BASE_BE_ENDPOINT),,$(error BASE_BE_ENDPOINT is not set))
	printf 'NEXT_PUBLIC_BASE_BE_ENDPOINT=%s\n' '$(BASE_BE_ENDPOINT)' > frontend/.env
	cd frontend && PORT=$(FRONTEND_PORT) npx next dev -H 0.0.0.0 -p $(FRONTEND_PORT)

db-setup:
	cd backend && npm install
	cd backend && node -e "const {sequelize}=require('./models'); sequelize.sync({force:false}).then(()=>sequelize.close()).catch(error=>{console.error(error); process.exit(1)})"
	cd backend && node seed.js
