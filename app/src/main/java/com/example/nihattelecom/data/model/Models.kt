package com.example.nihattelecom.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class Operator(val displayName: String, val displayNameBn: String, val primaryPrefix: String) {
    GP("Grameenphone", "গ্রামীণফোন", "017"),
    Robi("Robi", "রবি", "018"),
    Airtel("Airtel", "এয়ারটেল", "016"),
    Banglalink("Banglalink", "বাংলালিংক", "019"),
    Teletalk("Teletalk", "টেলিটক", "015")
}

enum class ConnectionType(val title: String, val titleBn: String) {
    PREPAID("Prepaid", "প্রিপেইড"),
    POSTPAID("Postpaid", "পোস্টপেইড"),
    SKITTO("Skitto", "স্কিটো")
}

data class RechargePackage(
    val id: String,
    val title: String,
    val titleBn: String,
    val operator: Operator,
    val price: Double,
    val validity: String,
    val validityBn: String,
    val category: String, // "internet", "talktime", "bundle"
    val volume: String,
    val volumeBn: String,
    val description: String,
    val descriptionBn: String,
    val isPopular: Boolean = false
)

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val type: String, // Recharge, Bill, AddFund, Transfer, Voucher, ScratchCard, Fine
    val operator: String? = null,
    val targetNumber: String? = null,
    val senderNumber: String? = null,
    val amount: Double,
    val billerName: String? = null,
    val date: String,
    val txId: String,
    val status: String, // Success, Pending, Failed
    val transferMethod: String? = null,
    val note: String? = null
)

@Entity(tableName = "favorite_contacts")
data class FavoriteContactEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val number: String,
    val operator: String
)

@Entity(tableName = "phone_listings")
data class PhoneListingEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val brand: String,
    val model: String,
    val ram: String,
    val rom: String,
    val condition: String,
    val listingType: String, // Sell, Exchange, Both
    val price: Double,
    val sellerName: String,
    val sellerPhone: String,
    val location: String,
    val date: String
)

@Entity(tableName = "talikhata_records")
data class TaliKhataRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val partyName: String,
    val phone: String,
    val type: String, // "Give" (বাকি দিলাম / Customer) or "Take" (বাকি নিলাম / Supplier)
    val amount: Double,
    val note: String = "",
    val date: String
)

data class BillProvider(
    val id: String,
    val name: String,
    val nameBn: String,
    val category: String,
    val categoryBn: String
)

data class AppConfig(
    val bkashNumber: String = "01970250988",
    val nagadNumber: String = "01970250988",
    val rocketNumber: String = "019702509883",
    val upayNumber: String = "01970250988",
    val helplineNumber: String = "01970250988",
    val whatsappUrl: String = "https://wa.me/8801970250988",
    val personalCharge: String = "1.5% বা প্রতি হাজারে ১৫ টাকা",
    val noticeBn: String = "এয়ারটেল প্যাকেজগুলোর রক্ষণাবেক্ষনের কাজ চলছে। অন্য প্যাকেজ ব্যবহার করুন!",
    val noticeEn: String = "Airtel packages are currently in maintenance. Please purchase other packages!"
)
