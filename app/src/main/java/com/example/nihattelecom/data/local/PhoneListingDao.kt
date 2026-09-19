package com.example.nihattelecom.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.nihattelecom.data.model.PhoneListingEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PhoneListingDao {
    @Query("SELECT * FROM phone_listings ORDER BY id DESC")
    fun getAllListings(): Flow<List<PhoneListingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertListing(listing: PhoneListingEntity): Long

    @Query("DELETE FROM phone_listings WHERE id = :id")
    suspend fun deleteListing(id: Long)
}
