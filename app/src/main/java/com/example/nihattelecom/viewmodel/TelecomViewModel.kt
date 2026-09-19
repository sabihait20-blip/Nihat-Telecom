package com.example.nihattelecom.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.nihattelecom.data.model.AppConfig
import com.example.nihattelecom.data.model.BillProvider
import com.example.nihattelecom.data.model.FavoriteContactEntity
import com.example.nihattelecom.data.model.Operator
import com.example.nihattelecom.data.model.PhoneListingEntity
import com.example.nihattelecom.data.model.RechargePackage
import com.example.nihattelecom.data.model.TaliKhataRecord
import com.example.nihattelecom.data.model.TransactionEntity
import com.example.nihattelecom.data.repository.TelecomRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class TelecomViewModel(private val repository: TelecomRepository) : ViewModel() {

    val balance: StateFlow<Double> = repository.balance
    val appConfig: StateFlow<AppConfig> = repository.appConfig
    val packages: List<RechargePackage> = repository.packages
    val billProviders: List<BillProvider> = repository.billProviders

    val transactions: StateFlow<List<TransactionEntity>> = repository.transactions
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val favorites: StateFlow<List<FavoriteContactEntity>> = repository.favorites
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val phoneListings: StateFlow<List<PhoneListingEntity>> = repository.phoneListings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val taliKhataRecords: StateFlow<List<TaliKhataRecord>> = repository.taliKhataRecords
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _language = MutableStateFlow("bn") // "bn" or "en"
    val language: StateFlow<String> = _language.asStateFlow()

    private val _activeTab = MutableStateFlow("home") // home, packages, history, store, profile
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    private val _isBalanceVisible = MutableStateFlow(false)
    val isBalanceVisible: StateFlow<Boolean> = _isBalanceVisible.asStateFlow()

    private val _feedbackMessage = MutableStateFlow<String?>(null)
    val feedbackMessage: StateFlow<String?> = _feedbackMessage.asStateFlow()

    // Dialog Visibility States
    val showRecharge = MutableStateFlow(false)
    val showAddFund = MutableStateFlow(false)
    val showTransfer = MutableStateFlow(false)
    val showBillPay = MutableStateFlow(false)
    val showCashOutCalc = MutableStateFlow(false)
    val showPhoneExchange = MutableStateFlow(false)
    val showTaliKhata = MutableStateFlow(false)
    val showTrafficFine = MutableStateFlow(false)
    val showSimCard = MutableStateFlow(false)
    val showScratchCard = MutableStateFlow(false)
    val showSupport = MutableStateFlow(false)
    val showKyc = MutableStateFlow(false)

    fun toggleLanguage() {
        _language.value = if (_language.value == "bn") "en" else "bn"
    }

    fun setTab(tab: String) {
        _activeTab.value = tab
    }

    fun toggleBalanceVisibility() {
        _isBalanceVisible.value = !_isBalanceVisible.value
    }

    fun clearFeedback() {
        _feedbackMessage.value = null
    }

    fun showFeedback(msg: String) {
        _feedbackMessage.value = msg
    }

    fun doRecharge(number: String, amount: Double, operator: Operator, type: String) {
        viewModelScope.launch {
            val result = repository.recharge(number, amount, operator, type)
            if (result.isSuccess) {
                showFeedback(
                    if (_language.value == "bn") "৳$amount রিচার্জ সফল হয়েছে!"
                    else "৳$amount Recharge successful!"
                )
                showRecharge.value = false
            } else {
                showFeedback(result.exceptionOrNull()?.message ?: "Recharge Failed")
            }
        }
    }

    fun doAddFund(method: String, amount: Double, senderNumber: String, trxId: String) {
        viewModelScope.launch {
            repository.addFund(method, amount, senderNumber, trxId)
            showFeedback(
                if (_language.value == "bn") "৳$amount ফান্ড সফলভাবে যুক্ত হয়েছে!"
                else "৳$amount Fund added successfully!"
            )
            showAddFund.value = false
        }
    }

    fun doTransfer(targetNumber: String, amount: Double, note: String) {
        viewModelScope.launch {
            val result = repository.transfer(targetNumber, amount, note)
            if (result.isSuccess) {
                showFeedback(
                    if (_language.value == "bn") "৳$amount সেন্ড মানি সম্পন্ন হয়েছে!"
                    else "৳$amount Send money completed!"
                )
                showTransfer.value = false
            } else {
                showFeedback(result.exceptionOrNull()?.message ?: "Transfer Failed")
            }
        }
    }

    fun doPayBill(provider: BillProvider, accountNo: String, amount: Double) {
        viewModelScope.launch {
            val result = repository.payBill(provider, accountNo, amount)
            if (result.isSuccess) {
                showFeedback(
                    if (_language.value == "bn") "${provider.nameBn} বিল পরিশোধ সম্পন্ন হয়েছে!"
                    else "${provider.name} Bill paid successfully!"
                )
                showBillPay.value = false
            } else {
                showFeedback(result.exceptionOrNull()?.message ?: "Bill Pay Failed")
            }
        }
    }

    fun doScratchReward(amount: Double) {
        viewModelScope.launch {
            repository.claimScratchReward(amount)
            showFeedback(
                if (_language.value == "bn") "অভিনন্দন! আপনি ৳$amount ক্যাশব্যাক পেয়েছেন!"
                else "Congratulations! You won ৳$amount cashback!"
            )
            showScratchCard.value = false
        }
    }

    fun doPayTrafficFine(license: String, caseNo: String, amount: Double) {
        viewModelScope.launch {
            val result = repository.payTrafficFine(license, caseNo, amount)
            if (result.isSuccess) {
                showFeedback(
                    if (_language.value == "bn") "ই-ট্রাফিক জরিমানা সফলভাবে পরিশোধ হয়েছে!"
                    else "Traffic fine paid successfully!"
                )
                showTrafficFine.value = false
            } else {
                showFeedback(result.exceptionOrNull()?.message ?: "Fine payment failed")
            }
        }
    }

    fun addTaliKhata(party: String, phone: String, type: String, amount: Double, note: String) {
        viewModelScope.launch {
            repository.addTaliKhataRecord(party, phone, type, amount, note)
            showFeedback(
                if (_language.value == "bn") "তালিখাতা এন্ট্রি সফলভাবে সংরক্ষিত হয়েছে"
                else "TaliKhata entry saved successfully"
            )
        }
    }

    fun postPhoneListing(title: String, brand: String, model: String, ram: String, rom: String, condition: String, type: String, price: Double, name: String, phone: String, loc: String) {
        viewModelScope.launch {
            repository.addPhoneListing(title, brand, model, ram, rom, condition, type, price, name, phone, loc)
            showFeedback(
                if (_language.value == "bn") "ফোন লিস্টিং সফলভাবে পোস্ট হয়েছে!"
                else "Phone listing posted successfully!"
            )
            showPhoneExchange.value = false
        }
    }
}
