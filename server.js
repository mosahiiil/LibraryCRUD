// Import Mongoose
const mongoose = require('mongoose');
const express = require('express');
const app = express();
app.use(express.json());

// Validator for phone number
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Author Schema
const AuthorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: [validatePhoneNumber, 'Invalid phone number format'],
  },
}, { timestamps: true });

AuthorSchema.virtual('bookCount', {
  ref: 'Book',
  localField: '_id',
  foreignField: 'author',
  count: true,
});

AuthorSchema.pre('save', async function (next) {
  const author = this;
  const Book = mongoose.model('Book');

  const bookCount = await Book.countDocuments({ author: author._id });
  if (bookCount >= 5) {
    throw new Error('An author can only be linked to up to 5 books at a time');
  }

  next();
});

// Book Schema
const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    required: true,
  },
  isbn: {
    type: String,
    required: true,
    unique: true,
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: async function (value) {
        if (this.borrowedCount > 10 && value > 100) {
          throw new Error('Available copies cannot exceed 100 if the book has been borrowed more than 10 times');
        }
      },
      message: 'Validation failed for availableCopies',
    },
  },
}, { timestamps: true });

BookSchema.virtual('borrowedCount', {
  ref: 'Borrower',
  localField: '_id',
  foreignField: 'borrowedBooks',
  count: true,
});

// Borrower Schema
const BorrowerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  borrowedBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
  }],
  membershipActive: {
    type: Boolean,
    required: true,
  },
  membershipType: {
    type: String,
    enum: ['Standard', 'Premium'],
    required: true,
  },
  overdueBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
  }],
}, { timestamps: true });

BorrowerSchema.pre('save', function (next) {
  const borrower = this;

  if (borrower.membershipType === 'Standard' && borrower.borrowedBooks.length > 5) {
    throw new Error('Standard members can borrow up to 5 books at a time');
  }

  if (borrower.membershipType === 'Premium' && borrower.borrowedBooks.length > 10) {
    throw new Error('Premium members can borrow up to 10 books at a time');
  }

  next();
});

// Models
const Author = mongoose.model('Author', AuthorSchema);
const Book = mongoose.model('Book', BookSchema);
const Borrower = mongoose.model('Borrower', BorrowerSchema);

// CRUD Operations

// Book Routes
app.post('/books', async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).send(book);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get('/books', async (req, res) => {
  try {
    const books = await Book.find().populate('author');
    res.send(books);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.put('/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.send(book);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.send(book);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Author Routes
app.post('/authors', async (req, res) => {
  try {
    const author = new Author(req.body);
    await author.save();
    res.status(201).send(author);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get('/authors', async (req, res) => {
  try {
    const authors = await Author.find().populate('bookCount');
    res.send(authors);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.put('/authors/:id', async (req, res) => {
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!author) {
      return res.status(404).send({ error: 'Author not found' });
    }
    res.send(author);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.delete('/authors/:id', async (req, res) => {
  try {
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) {
      return res.status(404).send({ error: 'Author not found' });
    }
    res.send(author);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get('/authors/exceeding-limit', async (req, res) => {
  try {
    const authors = await Author.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: 'author',
          as: 'books',
        },
      },
      {
        $addFields: {
          bookCount: { $size: '$books' },
        },
      },
      {
        $match: {
          bookCount: { $gt: 5 },
        },
      },
    ]);

    res.send(authors);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Borrower Routes
app.post('/borrowers', async (req, res) => {
  try {
    const borrower = new Borrower(req.body);
    await borrower.save();
    res.status(201).send(borrower);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get('/borrowers', async (req, res) => {
  try {
    const borrowers = await Borrower.find().populate('borrowedBooks overdueBooks');
    res.send(borrowers);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.put('/borrowers/:id', async (req, res) => {
  try {
    const borrower = await Borrower.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!borrower) {
      return res.status(404).send({ error: 'Borrower not found' });
    }
    res.send(borrower);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Borrow and Return Routes
app.post('/borrow/:borrowerId/:bookId', async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.borrowerId);
    const book = await Book.findById(req.params.bookId);

    if (!borrower || !book) {
      return res.status(404).send({ error: 'Borrower or Book not found' });
    }

    if (!book.availableCopies) {
      return res.status(400).send({ error: 'No available copies of the book' });
    }

    if (borrower.overdueBooks.length > 0) {
      return res.status(400).send({ error: 'Borrower has overdue books' });
    }

    if (borrower.membershipType === 'Standard' && borrower.borrowedBooks.length >= 5) {
      return res.status(400).send({ error: 'Standard members cannot borrow more than 5 books' });
    }

    if (borrower.membershipType === 'Premium' && borrower.borrowedBooks.length >= 10) {
      return res.status(400).send({ error: 'Premium members cannot borrow more than 10 books' });
    }

    borrower.borrowedBooks.push(book._id);
    book.availableCopies -= 1;

    await borrower.save();
    await book.save();

    res.send({ borrower, book });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post('/return/:borrowerId/:bookId', async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.borrowerId);
    const book = await Book.findById(req.params.bookId);

    if (!borrower || !book) {
      return res.status(404).send({ error: 'Borrower or Book not found' });
    }

    const bookIndex = borrower.borrowedBooks.indexOf(book._id);
    if (bookIndex === -1) {
      return res.status(400).send({ error: 'The book is not borrowed by the borrower' });
    }

    borrower.borrowedBooks.splice(bookIndex, 1);
    book.availableCopies += 1;

    await borrower.save();
    await book.save();

    res.send({ borrower, book });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Connect to MongoDB and start the server
mongoose.connect('mongodb://localhost:27017/library', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});
