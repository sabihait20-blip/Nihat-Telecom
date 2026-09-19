package com.example.nihattelecom.data.repository

import com.example.nihattelecom.data.local.AppDatabase
import com.example.nihattelecom.data.model.AppConfig
import com.example.nihattelecom.data.model.BillProvider
import com.example.nihattelecom.data.model.FavoriteContactEntity
import com.example.nihattelecom.data.model.Operator
import com.example.nihattelecom.data.model.PhoneListingEntity
import com.example.nihattelecom.data.model.RechargePackage
import com.example.nihattelecom.data.model.TaliKhataRecord
import com.example.nihattelecom.data.model.TransactionEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class TelecomRepository(private val database: AppDatabase) {

    private val _balance = MutableStateFlow(250.0)
    val balance: StateFlow<Double> = _balance.asStateFlow()

    private val _appConfig = MutableStateFlow(AppConfig())
    val appConfig: StateFlow<AppConfig> = _appConfig.asStateFlow()

    val transactions: Flow<List<TransactionEntity>> = database.transactionDao().getAllTransactions()
    val favorites: Flow<List<FavoriteContactEntity>> = database.favoriteContactDao().getAllContacts()
    val phoneListings: Flow<List<PhoneListingEntity>> = database.phoneListingDao().getAllListings()
    val taliKhataRecords: Flow<List<TaliKhataRecord>> = database.taliKhataDao().getAllRecords()

    val packages: List<RechargePackage> = listOf(
        RechargePackage(
            id = "pkg-1",
            title = "GP 30 GB Internet",
            titleBn = "জিপি ৩০ জিবি ইন্টারনেট",
            operator = Operator.GP,
            price = 499.0,
            validity = "30 Days",
            validityBn = "৩০ দিন",
            category = "internet",
            volume = "30 GB",
            volumeBn = "৩০জিবি",
            description = "High-speed internet for work and streaming",
            descriptionBn = "উচ্চগতির ইন্টারনেট কাজ ও স্ট্রিমিংয়ের জন্য",
            isPopular = true
        ),
        RechargePackage(
            id = "pkg-2",
            title = "Robi Core Bundle Pack",
            titleBn = "রবি কোর বান্ডেল প্যাক",
            operator = Operator.Robi,
            price = 348.0,
            validity = "30 Days",
            validityBn = "৩০ দিন",
            category = "bundle",
            volume = "15 GB + 400 Min",
            volumeBn = "১৫জিবি + ৪০০ মি.",
            description = "All-in-one monthly family internet & calls",
            descriptionBn = "মাসিক ব্যবহারের জন্য সেরা অল-ইন-ওয়ান প্যাক",
            isPopular = true
        ),
        RechargePackage(
            id = "pkg-3",
            title = "BL Non-Stop Social",
            titleBn = "বাংলালিংক সোশ্যাল প্যাক",
            operator = Operator.Banglalink,
            price = 129.0,
            validity = "7 Days",
            validityBn = "৭ দিন",
            category = "internet",
            volume = "10 GB (Social)",
            volumeBn = "১০জিবি (সোশ্যাল)",
            description = "Social media, YouTube & TikTok non-stop access",
            descriptionBn = "সোশ্যাল মিডিয়া, ইউটিউব ও টিকটক নন-স্টপ ব্যবহার",
            isPopular = false
        ),
        RechargePackage(
            id = "pkg-4",
            title = "Airtel Voice Bonanza",
            titleBn = "এয়ারটেল ভয়েস বোনানজা",
            operator = Operator.Airtel,
            price = 198.0,
            validity = "30 Days",
            validityBn = "৩০ দিন",
            category = "talktime",
            volume = "320 Minutes",
            volumeBn = "৩২০ মিনিট",
            description = "Crystal clear voice minutes to any local number",
            descriptionBn = "যেকোনো অপারেটরে নিরবচ্ছিন্ন কথা বলার সুবিধা",
            isPopular = false
        ),
        RechargePackage(
            id = "pkg-5",
            title = "Teletalk Shadhinota Combo",
            titleBn = "টেলিটক স্বাধীনতা কম্বো",
            operator = Operator.Teletalk,
            price = 99.0,
            validity = "15 Days",
            validityBn = "১৫ দিন",
            category = "bundle",
            volume = "5 GB + 100 Min",
            volumeBn = "৫জিবি + ১০০ মি.",
            description = "Subsidized low-cost government network bundle",
            descriptionBn = "সাশ্রয়ী মূল্যে সরকারি নেটওয়ার্কের সেরা অফার",
            isPopular = true
        )
    )

    val billProviders: List<BillProvider> = listOf(
        BillProvider("desco", "DESCO (Prepaid/Postpaid)", "ডেসকো বিদ্যুৎ", "Electricity", "বিদ্যুৎ"),
        BillProvider("dpdc", "DPDC Electricity", "ডিপিডিসি বিদ্যুৎ", "Electricity", "বিদ্যুৎ"),
        BillProvider("nesco", "NESCO Electricity", "নেসকো বিদ্যুৎ", "Electricity", "বিদ্যুৎ"),
        BillProvider("wasa_dhaka", "Dhaka WASA", "ঢাকা ওয়াসা", "Water", "পানি"),
        BillProvider("titas", "Titas Gas", "তিতাস গ্যাস", "Gas", "গ্যাস"),
        BillProvider("link3", "Link3 Broadband", "লিংকথ্রি ইন্টারনেট", "Internet", "ইন্টারনেট"),
        BillProvider("carnival", "Carnival Internet", "কার্নিভাল ইন্টারনেট", "Internet", "ইন্টারনেট")
    )

    suspend fun recharge(
        number: String,
        amount: Double,
        operator: Operator,
        connectionType: String
    ): Result<TransactionEntity> {
        val current = _balance.value
        if (current < amount) {
            return Result.failure(Exception("অপর্যাপ্ত ব্যালেন্স! দয়া করে ফান্ড যুক্ত করুন।"))
        }
        _balance.value = current - amount
        val tx = TransactionEntity(
            type = "Recharge",
            operator = operator.name,
            targetNumber = number,
            amount = amount,
            date = getCurrentFormattedDate(),
            txId = generateTrxId(),
            status = "Success",
            note = "$connectionType Recharge for $number ($operator)"
        )
        database.transactionDao().insertTransaction(tx)
        return Result.success(tx)
    }

    suspend fun addFund(
        method: String,
        amount: Double,
        senderNumber: String,
        trxId: String
    ): TransactionEntity {
        _balance.value = _balance.value + amount
        val tx = TransactionEntity(
            type = "AddFund",
            senderNumber = senderNumber,
            amount = amount,
            date = getCurrentFormattedDate(),
            txId = trxId.ifBlank { generateTrxId() },
            status = "Success",
            transferMethod = method,
            note = "Add Fund via $method"
        )
        database.transactionDao().insertTransaction(tx)
        return tx
    }

    suspend fun transfer(
        targetNumber: String,
        amount: Double,
        noteText: String
    ): Result<TransactionEntity> {
        val current = _balance.value
        if (current < amount) {
            return Result.failure(Exception("অপর্যাপ্ত ব্যালেন্স!"))
        }
        _balance.value = current - amount
        val tx = TransactionEntity(
            type = "Transfer",
            targetNumber = targetNumber,
            amount = amount,
            date = getCurrentFormattedDate(),
            txId = generateTrxId(),
            status = "Success",
            note = noteText.ifBlank { "Send Money to $targetNumber" }
        )
        database.transactionDao().insertTransaction(tx)
        return Result.success(tx)
    }

    suspend fun payBill(
        provider: BillProvider,
        accountNo: String,
        amount: Double
    ): Result<TransactionEntity> {
        val current = _balance.value
        if (current < amount) {
            return Result.failure(Exception("অপর্যাপ্ত ব্যালেন্স!"))
        }
        _balance.value = current - amount
        val tx = TransactionEntity(
            type = "Bill",
            billerName = provider.name,
            targetNumber = accountNo,
            amount = amount,
            date = getCurrentFormattedDate(),
            txId = generateTrxId(),
            status = "Success",
            note = "Bill Payment to ${provider.name} (Acc: $accountNo)"
        )
        database.transactionDao().insertTransaction(tx)
        return Result.success(tx)
    }

    suspend fun claimScratchReward(rewardAmount: Double): TransactionEntity {
        _balance.value = _balance.value + rewardAmount
        val tx = TransactionEntity(
            type = "ScratchCard",
            amount = rewardAmount,
            date = getCurrentFormattedDate(),
            txId = generateTrxId(),
            status = "Success",
            note = "Daily Scratch Card Reward Cashback"
        )
        database.transactionDao().insertTransaction(tx)
        return tx
    }

    suspend fun payTrafficFine(license: String, caseNo: String, amount: Double): Result<TransactionEntity> {
        val current = _balance.value
        if (current < amount) {
            return Result.failure(Exception("অপর্যাপ্ত ব্যালেন্স!"))
        }
        _balance.value = current - amount
        val tx = TransactionEntity(
            type = "Fine",
            targetNumber = license,
            amount = amount,
            date = getCurrentFormattedDate(),
            txId = generateTrxId(),
            status = "Success",
            note = "E-Challan Fine Payment (Case: $caseNo)"
        )
        database.transactionDao().insertTransaction(tx)
        return Result.success(tx)
    }

    suspend fun addTaliKhataRecord(party: String, phone: String, type: String, amount: Double, note: String) {
        database.taliKhataDao().insertRecord(
            TaliKhataRecord(
                partyName = party,
                phone = phone,
                type = type,
                amount = amount,
                note = note,
                date = getCurrentFormattedDate()
            )
        )
    }

    suspend fun addPhoneListing(title: String, brand: String, model: String, ram: String, rom: String, condition: String, type: String, price: Double, name: String, phone: String, loc: String) {
        database.phoneListingDao().insertListing(
            PhoneListingEntity(
                title = title,
                brand = brand,
                model = model,
                ram = ram,
                rom = rom,
                condition = condition,
                listingType = type,
                price = price,
                sellerName = name,
                sellerPhone = phone,
                location = loc,
                date = getCurrentFormattedDate()
            )
        )
    }

    suspend fun addFavorite(name: String, number: String, op: String) {
        database.favoriteContactDao().insertContact(
            FavoriteContactEntity(name = name, number = number, operator = op)
        )
    }

    private fun generateTrxId(): String {
        return "NBP" + UUID.randomUUID().toString().replace("-", "").take(9).uppercase()
    }

    private fun getCurrentFormattedDate(): String {
        val sdf = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
        return sdf.format(Date())
    }
}
