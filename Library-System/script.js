// script.js
let library;

class LibraryManager {
    constructor() {
        this.books = {};
        this.members = {};
        this.nextBookId = 1;
        this.nextMemberId = 1;
        this.booksPerPage = 10;
        this.currentPage = 1;
        this.init();
    }

    init() {
        this.loadData();
        if (Object.keys(this.books).length === 0) {
            this.initializeBooks();
        }
        this.renderStats();
        this.renderBooks();
        this.renderMembers();
        this.setupAutoSave();
    }

    initializeBooks() {
        const bookList = [
           {title:"The Great Gatsby",author:"F. Scott Fitzgerald",isbn:"978-0743273565",genre:"Fiction"},
            {title:"1984",author:"George Orwell",isbn:"978-0451524935",genre:"Dystopian"},
            {title:"How to Win Friends and Influence People",author:"Dale Carnegie",isbn:"978-0671027032",genre:"Self-Help"},
            {title:"How to win over a girl",author:"John Williams",isbn:"143-1431431431",genre:"Love Yourself"}
        ];

        bookList.forEach(bookData => {
            this.books[this.nextBookId] = {
                id: this.nextBookId,
                title: bookData.title,
                author: bookData.author,
                isbn: bookData.isbn,
                genre: bookData.genre,
                totalCopies: 1,
                availableCopies: 1,
                borrowedBy: []
            };
            this.nextBookId++;
        });
    }

    addBook(title, author, isbn, genre, copies = 1) {
        this.books[this.nextBookId] = {
            id: this.nextBookId,
            title, author, isbn, genre,
            totalCopies: parseInt(copies),
            availableCopies: parseInt(copies),
            borrowedBy: []
        };
        this.nextBookId++;
        this.renderBooks();
        this.renderStats();
        this.showToast('✅ Book added successfully!', 'success');
        this.saveData();
    }

    addMember(name, email, phone) {
        this.members[this.nextMemberId] = {
            id: this.nextMemberId,
            name, email, phone,
            borrowedBooks: []
        };
        this.nextMemberId++;
        this.renderMembers();
        this.renderStats();
        this.showToast('✅ Member added successfully!', 'success');
        this.saveData();
    }

    borrowBook(memberId, bookId) {
        if (!this.members[memberId]) return this.showToast('❌ Member not found!', 'danger');
        if (!this.books[bookId]) return this.showToast('❌ Book not found!', 'danger');

        const book = this.books[bookId];
        if (book.availableCopies <= 0) return this.showToast('❌ Book not available!', 'warning');

        book.availableCopies--;
        book.borrowedBy.push({ memberId, date: new Date().toISOString() });
        if (!this.members[memberId].borrowedBooks) this.members[memberId].borrowedBooks = [];
        this.members[memberId].borrowedBooks.push(bookId);

        this.renderStats();
        this.renderBooks();
        this.renderMembers();
        this.showToast(`✅ "${book.title}" borrowed!`, 'success');
        this.saveData();
    }

    returnBook(memberId, bookId) {
        if (!this.members[memberId] || !this.books[bookId]) return this.showToast('❌ Invalid ID!', 'danger');

        const book = this.books[bookId];
        const borrowIndex = book.borrowedBy.findIndex(b => b.memberId == memberId);

        if (borrowIndex === -1) return this.showToast('❌ Book not borrowed by this member!', 'warning');

        book.borrowedBy.splice(borrowIndex, 1);
        book.availableCopies++;

        const memberIndex = this.members[memberId].borrowedBooks.indexOf(bookId);
        if (memberIndex !== -1) this.members[memberId].borrowedBooks.splice(memberIndex, 1);

        this.renderStats();
        this.renderBooks();
        this.renderMembers();
        this.showToast(`✅ "${book.title}" returned!`, 'success');
        this.saveData();
    }

    // UI Modal Functions
    showAddBookModal() {
        new bootstrap.Modal(document.getElementById('addBookModal')).show();
    }

    addBookFromModal() {
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const isbn = document.getElementById('bookISBN').value.trim();
        const genre = document.getElementById('bookGenre').value;
        const copies = document.getElementById('bookCopies').value || 1;

        if (!title || !author || !isbn) {
            this.showToast('❌ Title, Author & ISBN required!', 'danger');
            return;
        }

        this.addBook(title, author, isbn, genre, copies);
        bootstrap.Modal.getInstance(document.getElementById('addBookModal')).hide();
    }

    showAddMemberModal() {
        new bootstrap.Modal(document.getElementById('addMemberModal')).show();
    }

    addMemberFromModal() {
        const name = document.getElementById('memberName').value.trim();
        const email = document.getElementById('memberEmail').value.trim();
        const phone = document.getElementById('memberPhone').value.trim();

        if (!name || !email) {
            this.showToast('❌ Name and Email required!', 'danger');
            return;
        }

        this.addMember(name, email, phone);
        bootstrap.Modal.getInstance(document.getElementById('addMemberModal')).hide();
    }

    borrowBookFromUI() {
        const memberId = parseInt(document.getElementById('borrowMemberId').value);
        const bookId = parseInt(document.getElementById('borrowBookId').value);
        if (!memberId || !bookId) return this.showToast('❌ Enter valid IDs!', 'danger');
        this.borrowBook(memberId, bookId);
    }

    returnBookFromUI() {
        const memberId = parseInt(document.getElementById('returnMemberId').value);
        const bookId = parseInt(document.getElementById('returnBookId').value);
        if (!memberId || !bookId) return this.showToast('❌ Enter valid IDs!', 'danger');
        this.returnBook(memberId, bookId);
    }

    // Rendering
    renderStats() {
        const totalBooks = Object.keys(this.books).length;
        const availableBooks = Object.values(this.books).filter(b => b.availableCopies > 0).length;
        const totalMembers = Object.keys(this.members).length;
        const borrowedCount = Object.values(this.books).reduce((sum, b) => sum + (b.totalCopies - b.availableCopies), 0);

        document.getElementById('totalBooks').textContent = totalBooks;
        document.getElementById('availableBooks').textContent = availableBooks;
        document.getElementById('totalMembers').textContent = totalMembers;
        document.getElementById('borrowedBooks').textContent = borrowedCount;
    }

    renderBooks() {
        const availableOnly = document.getElementById('availableOnly').checked;
        let books = Object.values(this.books);
        if (availableOnly) books = books.filter(b => b.availableCopies > 0);

        const start = (this.currentPage - 1) * this.booksPerPage;
        const pageBooks = books.slice(start, start + this.booksPerPage);

        const tbody = document.querySelector('#booksTable tbody');
        tbody.innerHTML = pageBooks.map(book => `
            <tr>
                <td><strong>${book.id}</strong></td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td><span class="badge bg-secondary">${book.genre}</span></td>
                <td>${book.isbn}</td>
                <td>
                    <span class="badge ${book.availableCopies > 0 ? 'bg-success' : 'bg-danger'}">
                        ${book.availableCopies > 0 ? 'Available' : 'Borrowed'}
                    </span>
                    <br><small>${book.availableCopies}/${book.totalCopies}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="library.viewBook(${book.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.renderPagination(books.length);
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.booksPerPage);
        let html = '<ul class="pagination justify-content-center">';

        html += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="library.prevPage()">Previous</a></li>`;

        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="library.goToPage(${i})">${i}</a></li>`;
        }

        html += `<li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="library.nextPage()">Next</a></li></ul>`;

        document.getElementById('booksPagination').innerHTML = html;
    }

    renderMembers() {
        const tbody = document.querySelector('#membersTable tbody');
        tbody.innerHTML = Object.values(this.members).map(member => `
            <tr>
                <td><strong>${member.id}</strong></td>
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.phone}</td>
                <td><span class="badge bg-info">${member.borrowedBooks ? member.borrowedBooks.length : 0}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="library.viewMember(${member.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-info" onclick="library.viewMemberBooks(${member.id})"><i class="fas fa-book"></i></button>
                </td>
            </tr>
        `).join('');
    }

    searchBooks() {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        const container = document.getElementById('searchResults');
        if (!query) { container.innerHTML = ''; return; }

        const results = Object.values(this.books).filter(book =>
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            book.genre.toLowerCase().includes(query)
        );

        container.innerHTML = results.length === 0 
            ? `<div class="alert alert-warning text-center">No books found!</div>`
            : results.slice(0, 12).map(book => `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6>${book.title}</h6>
                            <p class="small text-muted">${book.author}</p>
                            <span class="badge ${book.availableCopies > 0 ? 'bg-success' : 'bg-danger'}">${book.availableCopies > 0 ? 'Available' : 'Borrowed'}</span>
                        </div>
                    </div>
                </div>`).join('');
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    }

    changePerPage() {
        this.booksPerPage = parseInt(document.getElementById('booksPerPage').value);
        this.currentPage = 1;
        this.renderBooks();
    }

    prevPage() { if (this.currentPage > 1) { this.currentPage--; this.renderBooks(); } }
    nextPage() {
        const totalPages = Math.ceil(Object.keys(this.books).length / this.booksPerPage);
        if (this.currentPage < totalPages) { this.currentPage++; this.renderBooks(); }
    }
    goToPage(page) { this.currentPage = page; this.renderBooks(); }

    viewBook(id) {
        const book = this.books[id];
        if (book) {
            alert(`📚 Book Details\n\nID: ${book.id}\nTitle: ${book.title}\nAuthor: ${book.author}\nGenre: ${book.genre}\nISBN: ${book.isbn}\nCopies: ${book.availableCopies}/${book.totalCopies}`);
        }
    }

    viewMember(id) {
        const member = this.members[id];
        if (member) alert(`👤 Member\nID: ${member.id}\nName: ${member.name}\nEmail: ${member.email}\nPhone: ${member.phone}\nBooks Borrowed: ${member.borrowedBooks ? member.borrowedBooks.length : 0}`);
    }

    viewMemberBooks(id) {
        const member = this.members[id];
        if (!member?.borrowedBooks?.length) return alert('No books borrowed yet.');
        const list = member.borrowedBooks.map(bid => this.books[bid] ? this.books[bid].title : 'Unknown').join('\n');
        alert(`📚 Books borrowed by ${member.name}:\n\n${list}`);
    }

    // Data Save & Load
    saveData() {
        localStorage.setItem('library_data', JSON.stringify({
            books: this.books,
            members: this.members,
            nextBookId: this.nextBookId,
            nextMemberId: this.nextMemberId
        }));
    }

    loadData() {
        const data = localStorage.getItem('library_data');
        if (data) {
            const parsed = JSON.parse(data);
            this.books = parsed.books || {};
            this.members = parsed.members || {};
            this.nextBookId = parsed.nextBookId || 1;
            this.nextMemberId = parsed.nextMemberId || 1;
        }
    }

    setupAutoSave() {
        setInterval(() => this.saveData(), 30000);
    }

    showToast(message, type = 'info') {
        const toastEl = document.getElementById('liveToast');
        document.getElementById('toastMessage').innerHTML = message;
        toastEl.className = `toast text-white bg-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info'}`;
        new bootstrap.Toast(toastEl, { delay: 4000 }).show();
    }
}

// Start the application
window.onload = () => {
    library = new LibraryManager();
};