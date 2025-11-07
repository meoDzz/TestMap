// Import v2 modules
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions"); // Dùng logger cho v2

// Khởi tạo Admin SDK và Firestore
initializeApp();
const db = getFirestore();

/**
 * Trigger khi có một review mới được tạo trong collection 'reviews' (v2 Syntax).
 * Tự động tính toán lại và cập nhật averageRating & reviewCount
 * cho talent tương ứng trong collection 'professionals'.
 */
exports.updateTalentRating = onDocumentCreated("reviews/{reviewId}", async (event) => {

    // 1. Lấy dữ liệu từ review mới
    const snap = event.data;
    if (!snap) {
        logger.log("No data associated with the event, skipping.");
        return null;
    }

    const reviewData = snap.data();
    const talentId = reviewData.talentId;

    if (!talentId) {
        logger.log("Review thiếu talentId, bỏ qua.");
        return null;
    }

    // 2. Lấy tham chiếu đến tài liệu của talent
    const talentRef = db.collection("professionals").doc(talentId);

    // 3. Chạy một transaction để đảm bảo an toàn dữ liệu
    try {
        return db.runTransaction(async (transaction) => {
            // Lấy tất cả các review cho talent này
            const reviewsQuery = db.collection("reviews")
                                   .where("talentId", "==", talentId);
            const reviewsSnapshot = await transaction.get(reviewsQuery);

            const reviewCount = reviewsSnapshot.size;
            let totalRating = 0;

            reviewsSnapshot.forEach(doc => {
                totalRating += doc.data().rating;
            });

            // 4. Tính toán rating trung bình
            const averageRating = (reviewCount > 0) ? (totalRating / reviewCount) : 0;

            // 5. Cập nhật tài liệu 'professionals' với dữ liệu mới
            logger.info(`Cập nhật talent: ${talentId}. New Count: ${reviewCount}, New Avg: ${averageRating.toFixed(2)}`);

            transaction.set(talentRef, {
                reviewCount: reviewCount,
                averageRating: parseFloat(averageRating.toFixed(2)) // Làm tròn 2 chữ số
            }, { merge: true }); // merge: true để không ghi đè các trường khác

            return { reviewCount, averageRating };
        });
    } catch (error) {
        logger.error("Transaction failed: ", error);
        return null;
    }
});

