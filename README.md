QueueUp

QueueUp is a full-stack platform for booking appointments with professionals and joining their live walk-in queues. Customers can find a doctor, lawyer, salon or consultant, book a time slot, or take a token for a same-day queue and follow their position without creating an account.

Features

Customers

Browse and search professionals by name, category and speciality
View profiles with services, fees, ratings, location and availability
Book, cancel and reschedule appointments
Join a walk-in queue, get a token and track it with a private link
See how many people are ahead and an estimated wait time
Leave a review after a completed appointment

Professionals

Manage profile, fees, languages and booking status
Set weekly hours, holidays and blocked dates
View appointments by date and mark them completed or no-show
Run a daily queue: serve, complete, skip, pause and resume tokens

Admins

Manage categories and subcategories
Activate or deactivate professionals and mark them as featured
Moderate reviews and view platform statistics
Tech stack
Part	Technology
Frontend	Next.js 14, React 18
Backend	Node.js, Express
Database	SQLite via Sequelize
Auth	JWT, bcrypt, role-based access (customer, professional, admin)

Requires Python 3 and Node.js 20+.

```sh
make install-backend install-frontend
make run-backend
BASE_BE_ENDPOINT=http://localhost:8000 make run-frontend
```
