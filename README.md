Library Management System API
Introduction
This application is a Node.js-based Library Management System using Express and MongoDB (via Mongoose ORM). It provides APIs for managing authors, books, and borrowers, as well as borrowing and returning books.Validation rules and pre-save hooks ensure data consistency.
Features
- Manage authors with details like name, email, and phone number.
- Manage books with details like title, author, ISBN, and available copies.
- Manage borrowers with membership types and borrowed/overdue books.
- Borrowing and returning of books with validation based on membership type.
API Routes
Books
1. Create a Book - POST `/books`
Body: { title, author, isbn, availableCopies }
2. Get All Books - GET `/books`
3. Update a Book - PUT `/books/:id`
Body: { updated fields }
4. Delete a Book - DELETE `/books/:id`
Authors
1. Create an Author - POST `/authors`
Body: { name, email, phoneNumber }
2. Get All Authors - GET `/authors`
3. Update an Author - PUT `/authors/:id`
Body: { updated fields }
4. Delete an Author - DELETE `/authors/:id`
5. Get Authors Exceeding Book Limit - GET `/authors/exceeding-limit`
Borrowers
1. Create a Borrower - POST `/borrowers`
Body: { name, membershipActive, membershipType, borrowedBooks, overdueBooks }
2. Get All Borrowers - GET `/borrowers`
3. Update a Borrower - PUT `/borrowers/:id`
Body: { updated fields }
Borrow and Return
1. Borrow a Book - POST `/borrow/:borrowerId/:bookId`
2. Return a Book - POST `/return/:borrowerId/:bookId`
Validation and Rules Summary
- Authors can only be linked to up to 5 books at a time.
- Standard members can borrow up to 5 books, and Premium members can borrow up to 10 books.
- Available copies cannot exceed 100 if the book has been borrowed more than 10 times.
- Borrowers cannot borrow books if they have overdue books.
