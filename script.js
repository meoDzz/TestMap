// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// NEW: Import Firestore and add addDoc for subcollections
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, where, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// NEW: Import Storage modules
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
const firebaseConfig = {
  apiKey: "AIzaSyAaEbEL47oisvZQfIm5cntWyC-rWBFsX9Y",
  authDomain: "authenticcheck-2d92e.firebaseapp.com",
  projectId: "authenticcheck-2d92e",
  storageBucket: "authenticcheck-2d92e.firebasestorage.app",
  messagingSenderId: "59677864339",
  appId: "1:59677864339:web:a714223d2de9d26c28b866",
  measurementId: "G-Y72RRTY1G6"
};

// --- INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);


// Biến cho Leaflet
let map;
let markers = [];
let locationPickerMap;
let locationMarker;

// --- DOM ELEMENTS ---
const resultsList = document.getElementById('results-list');
const serviceTypeSelect = document.getElementById('service-type');
const searchBtn = document.getElementById('search-btn');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const userProfileActions = document.getElementById('user-profile');
const myProfileBtn = document.getElementById('my-profile-btn');

// --- RENDER FUNCTIONS ---
const createStarRating = (rating) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i data-lucide="star" class="w-4 h-4 ${i <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}"></i>`;
    }
    return stars;
};

const renderProfessionals = (professionals) => {
    resultsList.innerHTML = '';
    if (professionals.length === 0) {
         resultsList.innerHTML = `<p class="text-gray-500">No professionals found for this location and service.</p>`;
    }
    professionals.forEach(prof => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-md border border-gray-200';
        card.innerHTML = `
            <div class="flex space-x-4">
                <img src="${prof.photoURL || 'https://placehold.co/100x100'}" alt="${prof.displayName}" class="w-20 h-20 rounded-md object-cover">
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-bold">${prof.displayName}</h3>
                            <p class="text-sm text-gray-500 capitalize">${prof.service}</p>
                            <div class="flex items-center mt-1">
                                ${createStarRating(prof.averageRating || 0)}
                                <span class="text-xs text-gray-500 ml-2">(${(prof.reviewCount || 0)} reviews)</span>
                            </div>
                        </div>
                        <p class="text-lg font-bold text-gray-800">$${prof.price}/hr</p>
                    </div>
                    <p class="text-sm text-gray-700 mt-2">${prof.bio || 'No bio provided.'}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button class="view-profile-btn px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200" data-id="${prof.id}">View profile</button>
                <button class="book-btn px-6 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-800" data-id="${prof.id}">Book</button>
            </div>
        `;
        resultsList.appendChild(card);
    });
    lucide.createIcons();
};

const renderMap = (professionals) => {
    if (!map) {
        map = L.map('map').setView([16.047079, 108.206230], 10); // Default to Da Nang
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }
    markers.forEach(marker => marker.remove());
    markers = [];
    professionals.forEach(prof => {
        if (prof.lat && prof.lng) {
            const marker = L.marker([prof.lat, prof.lng]).addTo(map)
                .bindPopup(`<b>${prof.displayName}</b><br>${prof.service}`)
                .on('click', () => {
                    openPublicProfileModal(prof.id)
                });
            markers.push(marker);
        }
    });
};


// --- MODAL HANDLERS ---


const openPortfolioAddModal = () => {
    const modalContainer = document.getElementById('portfolio-add-modal');
    modalContainer.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Add Portfolio Photo</h2>
            <form id="portfolio-add-form">
                <div class="mb-4">
                    <label for="portfolio-image" class="block text-sm font-medium">Photo</label>
                    <input type="file" id="portfolio-image" name="image" accept="image/*" class="w-full mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200">
                </div>
                <div class="mb-4">
                    <label for="portfolio-location" class="block text-sm font-medium">Location</label>
                    <input type="text" id="portfolio-location" name="location" placeholder="e.g., Da Nang, Vietnam" class="w-full mt-1 border-gray-300 rounded-md">
                </div>
                <div class="mb-4">
                    <label for="portfolio-date" class="block text-sm font-medium">Date</label>
                    <input type="date" id="portfolio-date" name="date" class="w-full mt-1 border-gray-300 rounded-md">
                </div>
                <div class="mt-6 flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-200 px-4 py-2 rounded-full">Cancel</button>
                    <button type="submit" class="bg-black text-white px-4 py-2 rounded-full">Save Photo</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    document.getElementById('portfolio-add-form').onsubmit = savePortfolioItem;
};

const openPublicProfileModal = async (userId) => {
    const profDocRef = doc(db, "professionals", userId);
    const userDocRef = doc(db, "users", userId);
    
    const portfolioQuery = query(collection(db, "professionals", userId, "portfolio"));
    // ✅ Thêm query để tải reviews
    const reviewsQuery = query(collection(db, "reviews"), where("talentId", "==", userId));
    
    const [profDoc, userDoc, portfolioSnapshot, reviewsSnapshot] = await Promise.all([
        getDoc(profDocRef), 
        getDoc(userDocRef),
        getDocs(portfolioQuery),
        getDocs(reviewsQuery) // ✅ Tải reviews
    ]);
    if (!profDoc.exists() || !userDoc.exists()) {
        alert("Could not find profile details.");
        return;
    }

    const prof = { id: profDoc.id, ...profDoc.data() };
    const user = userDoc.data();
    const portfolioItems = portfolioSnapshot.docs.map(doc => doc.data());
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const modalContainer = document.getElementById('public-profile-modal');
    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">Talent Profile</h2>
                <button class="close-modal-btn">&times;</button>
            </div>
            <h4 class="font-semibold mt-4">About Me</h4>
            <p class="mb-4 text-gray-700">${prof.bio || 'No bio provided.'}</p>
            
            ${
                // Chỉ hiển thị mục này nếu có ít nhất 1 link
                prof.socials && Object.values(prof.socials).some(link => link) ? `
                <h4 class="font-semibold mt-4">Find me on</h4>
                <div class="flex space-x-4 mt-2 mb-4">
                    ${prof.socials.facebook ? `<a href="${prof.socials.facebook}" target="_blank" title="Facebook" class="text-gray-500 hover:text-blue-600"><i data-lucide="facebook" class="w-6 h-6"></i></a>` : ''}
                    ${prof.socials.x ? `<a href="${prof.socials.x}" target="_blank" title="X (Twitter)" class="text-gray-500 hover:text-black"><i data-lucide="twitter" class="w-6 h-6"></i></a>` : ''}
                    ${prof.socials.instagram ? `<a href="${prof.socials.instagram}" target="_blank" title="Instagram" class="text-gray-500 hover:text-pink-500"><i data-lucide="instagram" class="w-6 h-6"></i></a>` : ''}
                    ${prof.socials.youtube ? `<a href="${prof.socials.youtube}" target="_blank" title="YouTube" class="text-gray-500 hover:text-red-600"><i data-lucide="youtube" class="w-6 h-6"></i></a>` : ''}
                    ${prof.socials.threads ? `<a href="${prof.socials.threads}" target="_blank" title="Threads" class="text-gray-500 hover:text-gray-900"><i data-lucide="at-sign" class="w-6 h-6"></i></a>` : ''}
                </div>
                ` : ''
            }
            <h4 class="font-semibold mt-4">Reviews (${prof.reviewCount || 0})</h4>
            <div class="mt-2 space-y-4 max-h-48 overflow-y-auto pr-2">
                ${reviews.length > 0 ? reviews.map(review => `
                    <div class="border-b pb-2">
                        <div class="flex justify-between items-center">
                            <p class="font-semibold">${review.clientName}</p>
                            <div class="flex">
                                ${createStarRating(review.rating)}
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">${review.note}</p>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500 col-span-full">No reviews yet.</p>'}
            </div>
            <h4 class="font-semibold mt-4">Portfolio</h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                ${portfolioItems.length > 0 ? portfolioItems.map(item => `
                    <div class="relative group">
                        <img src="${item.imageUrl}" alt="Portfolio photo" class="w-full h-28 object-cover rounded-md zoomable-img cursor-zoom-in">
                        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <p>${item.location}</p>
                            <p>${item.date}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500 col-span-full">No portfolio photos yet.</p>'}
            </div>
            
            <h4 class="font-semibold mt-4">Contact</h4>
            <p class="mb-4 text-gray-700">Phone: ${user.phone || 'Not provided'}</p>
            <div class="flex justify-end space-x-2 mt-4">
                 <button class="close-modal-btn bg-gray-200 px-4 py-2 rounded-full">Close</button>
                 <button class="book-btn bg-black text-white px-6 py-2 rounded-full" data-id="${prof.id}">Book Now</button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    lucide.createIcons();
};

const openBookingModal = async (profId) => {
    if (!auth.currentUser) {
        alert("Please sign in to book.");
        return;
    }
    const profRef = doc(db, "professionals", profId);
    const profSnap = await getDoc(profRef);
    if(!profSnap.exists()) {
        alert("Professional not found!");
        return;
    }
    const prof = profSnap.data();

    const modalContainer = document.getElementById('booking-modal');
    modalContainer.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Booking ${prof.displayName}</h2>
            <p>An email notification will be sent to ${prof.displayName} to confirm this booking.</p>
             <div class="mt-6 flex justify-end space-x-2">
                <button class="close-modal-btn bg-gray-200 px-4 py-2 rounded-full">Cancel</button>
                <button id="confirm-booking-btn" class="bg-black text-white px-4 py-2 rounded-full">Confirm Booking</button>
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');

    document.getElementById('confirm-booking-btn').onclick = async () => {
        const bookingData = {
            talentId: profId,
            talentName: prof.displayName,
            talentEmail: prof.email,
            clientId: auth.currentUser.uid,
            clientName: auth.currentUser.displayName,
            clientEmail: auth.currentUser.email,
            status: 'pending', // Trạng thái ban đầu
            createdAt: new Date()
        };

        try {
            const bookingsCol = collection(db, 'bookings');
            await setDoc(doc(bookingsCol), bookingData);
            alert(`Booking request sent to ${prof.displayName}!`);
            closeAllModals();
        } catch(error) {
            console.error("Booking failed: ", error);
            alert("Booking failed. Please try again.");
        }
    };
};

// NEW: Helper function to get status badge color
const getStatusBadge = (status) => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'accepted':
            return 'bg-green-100 text-green-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        case 'completed':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};


// NEW: Function to load and render bookings for the current user
const loadAndRenderBookings = async (user) => {
    const bookingsListContainer = document.getElementById('bookings-list');
    bookingsListContainer.innerHTML = '<p class="text-gray-500">Loading bookings...</p>';

    // Query 1: Bookings the user made (as a client)
    const clientBookingsQuery = query(collection(db, "bookings"), where("clientId", "==", user.uid));
    
    // Query 2: Bookings for the user (as a talent)
    const talentBookingsQuery = query(collection(db, "bookings"), where("talentId", "==", user.uid));
    
    const [clientBookingsSnapshot, talentBookingsSnapshot] = await Promise.all([
        getDocs(clientBookingsQuery),
        getDocs(talentBookingsQuery)
    ]);

    const clientBookings = clientBookingsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    const talentBookings = talentBookingsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

    let html = '';

    // Render bookings the user made
    html += '<h4 class="text-md font-semibold mt-4">Bookings I\'ve Made</h4>';
    if (clientBookings.length > 0) {
        html += clientBookings.map(booking => `
            <div class="flex justify-between items-center p-2 border-b">
                <div>
                    <p class="font-semibold">Booking for: ${booking.talentName}</p>
                    <p class="text-sm text-gray-500">${new Date(booking.createdAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
                <div class="flex items-center space-x-2">
                     <p class="text-sm font-semibold capitalize px-2 py-1 rounded-full ${getStatusBadge(booking.status)}">${booking.status}</p>
                     ${booking.status === 'completed' ? `<button class="review-btn bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600" data-booking-id="${booking.id}" data-talent-id="${booking.talentId}" data-talent-name="${booking.talentName}">Review</button>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        html += '<p class="text-sm text-gray-500">You haven\'t made any bookings yet.</p>';
    }

    // Render bookings for the user (as a talent)
    html += '<h4 class="text-md font-semibold mt-8">Bookings for Me</h4>';
    if (talentBookings.length > 0) {
        html += talentBookings.map(booking => `
            <div class="flex justify-between items-center p-2 border-b">
                <div>
                    <p class="font-semibold">Booking from: ${booking.clientName}</p>
                    <p class="text-sm text-gray-500">${new Date(booking.createdAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
                <div class="flex items-center space-x-2">
                     ${booking.status === 'pending' ? `
                        <button class="accept-btn bg-green-500 text-white px-3 py-1 rounded-full text-sm hover:bg-green-600" data-booking-id="${booking.id}">Accept</button>
                        <button class="reject-btn bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600" data-booking-id="${booking.id}">Reject</button>
                     ` : booking.status === 'accepted' ? `
                        <button class="complete-btn bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600" data-booking-id="${booking.id}">Mark as Complete</button>
                     ` : `
                        <p class="text-sm font-semibold capitalize px-2 py-1 rounded-full ${getStatusBadge(booking.status)}">${booking.status}</p>
                     `}
                </div>
            </div>
        `).join('');
    } else {
        html += '<p class="text-sm text-gray-500">You don\'t have any booking requests.</p>';
    }

    bookingsListContainer.innerHTML = html;
};




const openMyProfileModal = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const profDocRef = doc(db, "professionals", user.uid);
    const portfolioQuery = query(collection(db, "professionals", user.uid, "portfolio"));
    
    const [userDoc, profDoc, portfolioSnapshot] = await Promise.all([
        getDoc(userDocRef), 
        getDoc(profDocRef),
        getDocs(portfolioQuery)
    ]);
    
    const userData = userDoc.exists() ? userDoc.data() : {};
    const profData = profDoc.exists() ? profDoc.data() : {};
    const portfolioItems = portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const modalContainer = document.getElementById('user-profile-modal');
    
    modalContainer.innerHTML = `
        <div class="modal-content modal-lg">
             <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h2 class="text-xl font-bold">My Profile</h2>
                <button class="close-modal-btn text-2xl">&times;</button>
             </div>
            
             <form id="personal-info-form">
                <h3 class="text-lg font-semibold">Personal Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                        <label for="profile-name" class="block text-sm font-medium">Name</label>
                        <input type="text" id="profile-name" value="${user.displayName || ''}" class="w-full mt-1 border-gray-300 rounded-md bg-gray-100" readonly>
                    </div>
                    <div>
                        <label for="profile-email" class="block text-sm font-medium">Email</label>
                        <input type="email" id="profile-email" value="${user.email || ''}" class="w-full mt-1 border-gray-300 rounded-md bg-gray-100" readonly>
                    </div>
                    <div>
                        <label for="profile-phone" class="block text-sm font-medium">Phone</label>
                        <input type="tel" id="profile-phone" value="${userData.phone || ''}" class="w-full mt-1 border-gray-300 rounded-md">
                    </div>
                    <div>
                        <label for="profile-dob" class="block text-sm font-medium">Date of Birth</label>
                        <input type="date" id="profile-dob" value="${userData.dob || ''}" class="w-full mt-1 border-gray-300 rounded-md">
                    </div>
                    <div>
                        <label for="user-role" class="block text-sm font-medium">Role</label>
                        <select id="user-role" class="w-full mt-1 border-gray-300 rounded-md">
                            <option value="user" ${userData.role === 'user' ? 'selected' : ''}>I'm a User</option>
                            <option value="talent" ${userData.role === 'talent' ? 'selected' : ''}>I'm a Talent</option>
                        </select>
                    </div>
                </div>
                <div class="text-right mt-4">
                    <button type="submit" class="bg-black text-white px-4 py-2 rounded-full">Save Personal Info</button>
                </div>
            </form>

            <form id="become-talent-form" class="mt-8 ${userData.role !== 'talent' ? 'hidden' : ''}">
                 <h3 class="text-lg font-semibold border-t pt-4">Talent Profile</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                        <label for="talent-service" class="block text-sm font-medium">Service</label>
                        <select id="talent-service" class="w-full mt-1 border-gray-300 rounded-md">
                            <option value="photographer" ${profData.service === 'photographer' ? 'selected' : ''}>Photographer</option>
                            <option value="guide" ${profData.service === 'guide' ? 'selected' : ''}>Tour Guide</option>
                            <option value="driver" ${profData.service === 'driver' ? 'selected' : ''}>Driver</option>
                        </select>
                    </div>
                    <div>
                        <label for="talent-price" class="block text-sm font-medium">Price (USD/hr)</label>
                        <input type="number" id="talent-price" value="${profData.price || ''}" class="w-full mt-1 border-gray-300 rounded-md">
                    </div>
                 </div>
                 <div class="mt-4">
                    <label for="talent-bio" class="block text-sm font-medium">Bio</label>
                    <textarea id="talent-bio" rows="3" class="w-full mt-1 border-gray-300 rounded-md">${profData.bio || ''}</textarea>
                 </div>

                 <div class="mt-4">
                    <h4 class="text-md font-semibold">Social Links (Optional)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                        
                        <div class="flex items-center space-x-2">
                            <i data-lucide="facebook" class="w-5 h-5 text-gray-500"></i>
                            <input type="url" id="social-facebook" placeholder="https://facebook.com/..." class="w-full text-sm border-gray-300 rounded-md" value="${profData.socials?.facebook || ''}">
                        </div>

                        <div class="flex items-center space-x-2">
                            <i data-lucide="twitter" class="w-5 h-5 text-gray-500"></i>
                            <input type="url" id="social-twitter" placeholder="https://twitter.com/..." class="w-full text-sm border-gray-300 rounded-md" value="${profData.socials?.x || ''}">
                        </div>

                        <div class="flex items-center space-x-2">
                            <i data-lucide="instagram" class="w-5 h-5 text-gray-500"></i>
                            <input type="url" id="social-instagram" placeholder="https://instagram.com/..." class="w-full text-sm border-gray-300 rounded-md" value="${profData.socials?.instagram || ''}">
                        </div>

                        <div class="flex items-center space-x-2">
                            <i data-lucide="youtube" class="w-5 h-5 text-gray-500"></i>
                            <input type="url" id="social-youtube" placeholder="https://youtube.com/..." class="w-full text-sm border-gray-300 rounded-md" value="${profData.socials?.youtube || ''}">
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            <i data-lucide="at-sign" class="w-5 h-5 text-gray-500"></i>
                            <input type="url" id="social-threads" placeholder="https://threads.net/..." class="w-full text-sm border-gray-300 rounded-md" value="${profData.socials?.threads || ''}">
                        </div>

                    </div>
                 </div>

                 <div class="mt-4">
                    <label class="block text-sm font-medium">My Location (Drag marker to set)</label>
                    <div id="location-picker-map" class="w-full mt-1" style="height: 200px; z-index: 1050;"></div>
                 </div>
                 <div class="text-right mt-4">
                    <button type="submit" class="bg-black text-white px-4 py-2 rounded-full">Save Talent Profile</button>
                </div>
            </form>
            
            <div id="talent-portfolio-section" class="mt-8 ${userData.role !== 'talent' ? 'hidden' : ''}">
                <div class="flex justify-between items-center mb-2 border-b pb-2">
                    <h3 class="text-lg font-semibold">My Portfolio</h3>
                    <button id="add-portfolio-btn" class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600">Add Photo</button>
                </div>
                
                <div id="portfolio-gallery" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    ${portfolioItems.length > 0 ? portfolioItems.map(item => `
                        <div class="relative group">
<img src="${item.imageUrl}" alt="Portfolio photo" class="w-full h-32 object-cover rounded-md zoomable-img cursor-zoom-in">                            <div class="absolute top-0 right-0 p-1 bg-black bg-opacity-50 rounded-bl-md z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="edit-portfolio-btn p-1 text-white hover:text-yellow-400" data-id="${item.id}"><i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i></button>
                                <button class="delete-portfolio-btn p-1 text-white hover:text-red-500" data-id="${item.id}"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                            </div>
                            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs rounded-b-md">
                                <p>${item.location}</p>
                                <p>${item.date}</p>
                            </div>
                        </div>
                    `).join('') : '<p class="text-gray-500 col-span-full">Your portfolio is empty. Add a photo to showcase your work!</p>'}
                </div>
            </div>

             <div class="mt-8">
                <h3 class="text-lg font-semibold border-t pt-4">My Bookings</h3>
                <div id="bookings-list" class="mt-2">
                    </div>
            </div>
        </div>
    `;
    
    modalContainer.classList.remove('hidden');
    lucide.createIcons();

    const roleSelect = document.getElementById('user-role');
    const talentForm = document.getElementById('become-talent-form');
    const portfolioSection = document.getElementById('talent-portfolio-section');
    
    const setupLocationPicker = () => {
        if (document.getElementById('location-picker-map') && !locationPickerMap) {
            const startLat = profData.lat || 16.047079;
            const startLng = profData.lng || 108.206230;
            setTimeout(() => {
                locationPickerMap = L.map('location-picker-map').setView([startLat, startLng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(locationPickerMap);
                locationMarker = L.marker([startLat, startLng], { draggable: true }).addTo(locationPickerMap);
                locationPickerMap.invalidateSize();
            }, 100); 
        }
    };

    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            if (roleSelect.value === 'talent') {
                talentForm.classList.remove('hidden');
                portfolioSection.classList.remove('hidden');
                setupLocationPicker();
            } else {
                talentForm.classList.add('hidden');
                portfolioSection.classList.add('hidden');
                if (locationPickerMap) {
                    locationPickerMap.remove();
                    locationPickerMap = null;
                }
            }
        });
    }

    if (userData.role === 'talent') {
       setupLocationPicker();
    }

    if (document.getElementById('add-portfolio-btn')) {
        document.getElementById('add-portfolio-btn').onclick = openPortfolioAddModal;
    }

    const portfolioGallery = document.getElementById('portfolio-gallery');
    if (portfolioGallery) {
        portfolioGallery.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-portfolio-btn');
            const deleteBtn = e.target.closest('.delete-portfolio-btn');

            if (editBtn) {
                openPortfolioEditModal(editBtn.dataset.id);
            }
            if (deleteBtn) {
                handleDeletePortfolioItem(deleteBtn.dataset.id);
            }
        });
    }

    loadAndRenderBookings(user);
    
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        bookingsListContainer.addEventListener('click', async (e) => {
            const user = auth.currentUser;
            if (!user) return;

            if (e.target.classList.contains('review-btn')) {
                const button = e.target;
                openReviewModal(button.dataset.bookingId, button.dataset.talentId, button.dataset.talentName);
            }
            if (e.target.classList.contains('accept-btn')) {
                const bookingId = e.target.dataset.bookingId;
                await updateBookingStatus(bookingId, 'accepted');
                loadAndRenderBookings(user);
            }
            if (e.target.classList.contains('reject-btn')) {
                const bookingId = e.target.dataset.bookingId;
                await updateBookingStatus(bookingId, 'rejected');
                loadAndRenderBookings(user);
            }
            if (e.target.classList.contains('complete-btn')) {
                const bookingId = e.target.dataset.bookingId;
                await updateBookingStatus(bookingId, 'completed');
                loadAndRenderBookings(user);
            }
        });
    }

    if (document.getElementById('personal-info-form')) {
        document.getElementById('personal-info-form').onsubmit = savePersonalInfo;
    }
    if (document.getElementById('become-talent-form')) {
        document.getElementById('become-talent-form').onsubmit = saveTalentProfile;
    }
};

const openPortfolioEditModal = async (itemId) => {
    const user = auth.currentUser;
    if (!user) return;

    // Lấy thông tin item cũ
    const itemRef = doc(db, "professionals", user.uid, "portfolio", itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
        alert("Photo not found!");
        return;
    }
    const item = itemSnap.data();

    const modalContainer = document.getElementById('portfolio-edit-modal');
    modalContainer.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Edit Portfolio Photo</h2>
            <form id="portfolio-edit-form">
                <div class="mb-4">
                    <label>Photo</label>
                    <img src="${item.imageUrl}" class="w-full h-40 object-cover rounded-md mt-1"/>
                </div>
                <div class="mb-4">
                    <label for="portfolio-edit-location" class="block text-sm font-medium">Location</label>
                    <input type="text" id="portfolio-edit-location" name="location" value="${item.location}" class="w-full mt-1 border-gray-300 rounded-md">
                </div>
                <div class="mb-4">
                    <label for="portfolio-edit-date" class="block text-sm font-medium">Date</label>
                    <input type="date" id="portfolio-edit-date" name="date" value="${item.date}" class="w-full mt-1 border-gray-300 rounded-md">
                </div>
                <div class="mt-6 flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-200 px-4 py-2 rounded-full">Cancel</button>
                    <button type="submit" class="bg-black text-white px-4 py-2 rounded-full">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    
    // Gán sự kiện submit cho form
    document.getElementById('portfolio-edit-form').onsubmit = (e) => handleUpdatePortfolioItem(e, itemId);
};


const handleUpdatePortfolioItem = async (e, itemId) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const location = document.getElementById('portfolio-edit-location').value;
    const date = document.getElementById('portfolio-edit-date').value;

    if (!location || !date) {
        alert("Please fill all fields.");
        return;
    }

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const itemRef = doc(db, "professionals", user.uid, "portfolio", itemId);
        await updateDoc(itemRef, {
            location: location,
            date: date
        });

        alert("Portfolio photo updated successfully!");
        closeAllModals();
        openMyProfileModal(); // Refresh profile modal

    } catch (error) {
        console.error("Error updating portfolio item: ", error);
        alert("Failed to update photo. Please try again.");
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
};
const handleDeletePortfolioItem = async (itemId) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm("Are you sure you want to delete this photo? This action cannot be undone.")) {
        return;
    }

    try {
        const itemRef = doc(db, "professionals", user.uid, "portfolio", itemId);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
            const item = itemSnap.data();
            const imageUrl = item.imageUrl;

            // 1. Xóa file trên Firebase Storage
            if (imageUrl) {
                try {
                    const storageRef = ref(storage, imageUrl);
                    await deleteObject(storageRef);
                } catch (storageError) {
                    console.warn("Could not delete file from Storage, it might be already deleted or rules prevent it:", storageError);
                }
            }

            // 2. Xóa document trên Firestore
            await deleteDoc(itemRef);

            alert("Portfolio photo deleted successfully!");
            closeAllModals();
            openMyProfileModal(); // Refresh profile modal
        } else {
            alert("Photo not found.");
        }

    } catch (error) {
        console.error("Error deleting portfolio item: ", error);
        alert("Failed to delete photo. Please try again.");
    }
};

const openReviewModal = (bookingId, talentId, talentName) => {
    const modalContainer = document.getElementById('review-modal');
    modalContainer.innerHTML = `
        <div class="modal-content">
            <h2 class="text-xl font-bold mb-4">Leave a Review for ${talentName}</h2>
            <form id="review-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Rating</label>
                    <div class="flex space-x-1" id="star-rating-input">
                        ${[1, 2, 3, 4, 5].map(i => `<i data-lucide="star" class="w-8 h-8 text-gray-300 cursor-pointer" data-value="${i}"></i>`).join('')}
                    </div>
                    <input type="hidden" id="rating-value" name="rating" value="0">
                </div>
                <div class="mb-4">
                    <label for="review-note" class="block text-sm font-medium">Note</label>
                    <textarea id="review-note" name="note" rows="4" class="w-full mt-1 border-gray-300 rounded-md"></textarea>
                </div>
                <div class="mt-6 flex justify-end space-x-2">
                    <button type="button" class="close-modal-btn bg-gray-200 px-4 py-2 rounded-full">Cancel</button>
                    <button type="submit" class="bg-black text-white px-4 py-2 rounded-full">Submit Review</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    lucide.createIcons();

    let rating = 0;
    const stars = document.querySelectorAll('#star-rating-input svg');    
    stars.forEach(star => {
        
        star.addEventListener('mouseover', () => {
            const hoverValue = star.dataset.value;
            stars.forEach(s => {
                s.classList.toggle('text-yellow-400', s.dataset.value <= hoverValue);
                s.classList.toggle('fill-current', s.dataset.value <= hoverValue);
                s.classList.toggle('text-gray-300', s.dataset.value > hoverValue);
            });
        });

        star.addEventListener('mouseout', () => {
             stars.forEach(s => {
                s.classList.toggle('text-yellow-400', s.dataset.value <= rating);
                s.classList.toggle('fill-current', s.dataset.value <= rating);
                s.classList.toggle('text-gray-300', s.dataset.value > rating);
            });
        });

        star.addEventListener('click', () => {
            // 1. Gán giá trị mới
            rating = star.dataset.value;
            document.getElementById('rating-value').value = rating;
            
            stars.forEach(s => {
                s.classList.toggle('text-yellow-400', s.dataset.value <= rating);
                s.classList.toggle('fill-current', s.dataset.value <= rating);
                s.classList.toggle('text-gray-300', s.dataset.value > rating);
            });
        }); // <-- Dấu ngoặc của 'click' ở đây


    });

    document.getElementById('review-form').onsubmit = (e) => saveReview(e, bookingId, talentId);
};


const closeAllModals = () => {
    document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.add('hidden'));
    
    // ✅ THÊM CÁC DÒNG NÀY VÀO
    const zoomImage = document.getElementById('image-zoom-modal')?.querySelector('img');
    if (zoomImage) {
        zoomImage.src = ""; // Xóa src để tránh bị nháy ảnh
    }
    // ✅ KẾT THÚC PHẦN THÊM

    if (locationPickerMap) {
        locationPickerMap.remove();
        locationPickerMap = null;
    }
};

// --- DATA HANDLING FUNCTIONS ---
const savePortfolioItem = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const imageFile = document.getElementById('portfolio-image').files[0];
    const location = document.getElementById('portfolio-location').value;
    const date = document.getElementById('portfolio-date').value;

    if (!imageFile || !location || !date) {
        alert("Please fill all fields and select an image.");
        return;
    }

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // 1. Upload image to Firebase Storage
        const filePath = `portfolios/${user.uid}/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 2. Save image info to Firestore subcollection
        const portfolioData = {
            imageUrl: downloadURL,
            location: location,
            date: date,
            createdAt: new Date()
        };
        
        const portfolioColRef = collection(db, "professionals", user.uid, "portfolio");
        await addDoc(portfolioColRef, portfolioData);

        alert("Portfolio photo added successfully!");
        closeAllModals();
        openMyProfileModal(); // Refresh profile modal to show new photo

    } catch (error) {
        console.error("Error adding portfolio item: ", error);
        alert("Failed to add photo. Please try again.");
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Photo';
    }
};
// NEW: Function to update booking status
const updateBookingStatus = async (bookingId, newStatus) => {
    console.log(`Updating booking ${bookingId} to ${newStatus}`);
    const bookingRef = doc(db, "bookings", bookingId);
    try {
        await updateDoc(bookingRef, {
            status: newStatus
        });
        alert(`Booking has been ${newStatus}.`);
    } catch (error) {
        console.error("Error updating booking status: ", error);
        alert("Failed to update booking status. Please try again.");
    }
};

const savePersonalInfo = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    
    const userData = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        phone: document.getElementById('profile-phone').value,
        dob: document.getElementById('profile-dob').value,
        role: document.getElementById('user-role').value,
    };
    
    try {
        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        alert("Personal information saved!");
    } catch (error) {
        console.error("Error saving user data: ", error);
        alert("Failed to save. Please try again.");
    }
};

const saveTalentProfile = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const coords = locationMarker.getLatLng();

    const talentData = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        service: document.getElementById('talent-service').value,
        price: document.getElementById('talent-price').value,
        bio: document.getElementById('talent-bio').value,
        lat: coords.lat,
        lng: coords.lng,
        socials: {
            facebook: document.getElementById('social-facebook').value,
            x: document.getElementById('social-twitter').value,
            instagram: document.getElementById('social-instagram').value,
            youtube: document.getElementById('social-youtube').value,
            threads: document.getElementById('social-threads').value
        }
    };

    if (!talentData.service || !talentData.price || !talentData.bio) {
        alert("Please fill all talent fields.");
        return;
    }

    try {
        await setDoc(doc(db, "professionals", user.uid), talentData, { merge: true });
        alert("Talent profile saved! Your profile is now public.");
        closeAllModals();
    } catch (error) {
        console.error("Error saving talent profile: ", error);
        alert("Failed to save talent profile.");
    }
};

// const saveReview = async (e, bookingId, talentId) => {
//     e.preventDefault();
//     const user = auth.currentUser;
//     if (!user) return;

//     const rating = document.getElementById('rating-value').value;
//     const note = document.getElementById('review-note').value;

//     if (rating === "0") {
//         alert("Please select a star rating.");
//         return;
//     }

//     const reviewData = {
//         talentId: talentId,
//         clientId: user.uid,
//         clientName: user.displayName,
//         rating: parseInt(rating, 10),
//         note: note,
//         createdAt: new Date(),
//         bookingId: bookingId
//     };

//     try {
//         const reviewsCol = collection(db, 'reviews');
//         await setDoc(doc(reviewsCol), reviewData);
        
//         const profRef = doc(db, "professionals", talentId);
//         const reviewsQuery = query(collection(db, "reviews"), where("talentId", "==", talentId));
        
//         const querySnapshot = await getDocs(reviewsQuery);
//         const reviews = querySnapshot.docs.map(doc => doc.data());
//         const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
//         const averageRating = totalRating / reviews.length;
//         const reviewCount = reviews.length;

//         await setDoc(profRef, { 
//             averageRating: averageRating,
//             reviewCount: reviewCount 
//         }, { merge: true });

//         alert("Review submitted successfully!");
//         closeAllModals();
//     } catch (error) {
//         console.error("Error submitting review: ", error);
//         alert("Failed to submit review.");
//     }
// };

const saveReview = async (e, bookingId, talentId) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const rating = document.getElementById('rating-value').value;
    const note = document.getElementById('review-note').value;

    if (rating === "0") {
        alert("Please select a star rating.");
        return;
    }

    const reviewData = {
        talentId: talentId,
        clientId: user.uid,
        clientName: user.displayName,
        rating: parseInt(rating, 10),
        note: note,
        createdAt: new Date(),
        bookingId: bookingId
    };

    try {
        // 1. Chỉ cần thêm review mới
        const reviewsCol = collection(db, 'reviews');
        await addDoc(reviewsCol, reviewData); // Dùng addDoc để tự tạo ID
        
        // 2. TOÀN BỘ LOGIC CẬP NHẬT TALENT PROFILE ĐÃ BỊ XÓA KHỎI ĐÂY
        // Cloud Function sẽ tự động làm phần còn lại

        alert("Review submitted successfully! The talent's rating will be updated shortly.");
        closeAllModals();

    } catch (error) {
        // Lỗi sẽ không xảy ra ở đây nữa nếu Rules của bạn đã được publish
        console.error("Error submitting review: ", error);
        alert("Failed to submit review. " + error.message);
    }
};


// --- AUTHENTICATION ---
const handleSignIn = () => {
    signInWithPopup(auth, provider).catch(error => console.error(error));
};

const handleSignOut = () => {
    signOut(auth).catch(error => console.error(error));
};

onAuthStateChanged(auth, user => {
    if (user) {
        signInBtn.classList.add('hidden');
        userProfileActions.classList.remove('hidden');
        userProfileActions.classList.add('flex');
        document.getElementById('user-photo').src = user.photoURL;
        document.getElementById('user-name').textContent = user.displayName;

        const userDocRef = doc(db, "users", user.uid);
        getDoc(userDocRef).then(docSnap => {
            if (!docSnap.exists()) {
                setDoc(userDocRef, {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    createdAt: new Date(),
                    role: 'user'
                });
            }
        });

    } else {
        signInBtn.classList.remove('hidden');
        userProfileActions.classList.add('hidden');
    }
});


// --- EVENT LISTENERS ---
document.addEventListener('click', (e) => {
    
    // --- Phần 1: Xử lý Modal Phóng to Ảnh ---
    const zoomModal = document.getElementById('image-zoom-modal');
    if (zoomModal) { 
        
        // Logic MỞ ảnh
        if (e.target.classList.contains('zoomable-img')) {
            const zoomImage = zoomModal.querySelector('img');
            zoomImage.src = e.target.src;
            zoomModal.classList.remove('hidden');
            return; // Đã xử lý, không làm gì thêm
        }

        // Logic ĐÓNG ảnh
        if (!zoomModal.classList.contains('hidden') && 
            (e.target.id === 'image-zoom-modal' || e.target.parentElement.id === 'image-zoom-modal')) 
        {
            const zoomImage = zoomModal.querySelector('img');
            if (zoomImage) {
                zoomImage.src = "";
            }
            zoomModal.classList.add('hidden');
            return; // Đã xử lý, không làm gì thêm
        }
    }

    // --- Phần 2: Xử lý các Modal Gốc (Profile, Booking, v.v.) ---
    
    // Nếu click vào một nút "close" HOẶC nền mờ (backdrop)
    if (e.target.closest('.close-modal-btn') || e.target.classList.contains('modal-backdrop')) {
        // (Chúng ta đã return ở trên nếu click là của zoomModal, nên code này an toàn)
        closeAllModals();
    }
});



resultsList.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-profile-btn');
    const bookBtn = e.target.closest('.book-btn');
    if (viewBtn) openPublicProfileModal(viewBtn.dataset.id);
    if (bookBtn) openBookingModal(bookBtn.dataset.id);
});

document.body.addEventListener('click', (e) => {
    const bookBtn = e.target.closest('.book-btn');
    if (bookBtn && bookBtn.parentElement.parentElement.classList.contains('modal-content')) {
        const profId = bookBtn.dataset.id;
        if(profId) {
           closeAllModals();
           openBookingModal(profId);
        }
    }
});

signInBtn.addEventListener('click', handleSignIn);
signOutBtn.addEventListener('click', handleSignOut);
myProfileBtn.addEventListener('click', openMyProfileModal);

// --- UTILITY FUNCTIONS ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = (lat2 - lat1) * (Math.PI / 180);
  var dLon = (lon2 - lon1) * (Math.PI / 180);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

searchBtn.addEventListener('click', async () => {
    const serviceType = serviceTypeSelect.value;
    const location = document.getElementById('location').value;

    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    if (!location) {
        alert("Vui lòng nhập địa điểm.");
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-lucide="search" class="w-5 h-5"></i><span>Search</span>';
        lucide.createIcons();
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "professionals"));
        const allProfessionals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
            headers: { 'User-Agent': 'TravelTalentApp/1.0 (your-email@example.com)' }
        });

        if (!response.ok) throw new Error(`API địa điểm lỗi. Status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.length > 0) {
            const searchedLat = parseFloat(data[0].lat);
            const searchedLon = parseFloat(data[0].lon);
            const searchRadiusKm = 50;

            map.setView([searchedLat, searchedLon], 11);

            const filteredByService = allProfessionals.filter(prof => 
                serviceType === 'all' || prof.service === serviceType
            );

            const finalFilteredList = filteredByService.filter(prof => {
                if (prof.lat === undefined || prof.lng === undefined) return false;
                const profLat = parseFloat(prof.lat);
                const profLng = parseFloat(prof.lng);
                if (isNaN(profLat) || isNaN(profLng)) return false;
                const distance = getDistanceFromLatLonInKm(searchedLat, searchedLon, profLat, profLng);
                return distance <= searchRadiusKm;
            });
            
            renderProfessionals(finalFilteredList);
            renderMap(finalFilteredList);

        } else {
            alert('Không tìm thấy địa điểm.');
            renderProfessionals([]);
            renderMap([]);
        }
    } catch (error) {
        console.error("Đã xảy ra lỗi trong quá trình tìm kiếm:", error);
        alert("Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.");
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i data-lucide="search" class="w-5 h-5"></i><span>Search</span>';
        lucide.createIcons();
    }
});

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }
    renderProfessionals([]);
    renderMap([]);
});