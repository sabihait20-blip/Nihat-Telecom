package com.example.nihattelecom.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.nihattelecom.data.model.FavoriteContactEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoriteContactDao {
    @Query("SELECT * FROM favorite_contacts ORDER BY id DESC")
    fun getAllContacts(): Flow<List<FavoriteContactEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContact(contact: FavoriteContactEntity): Long

    @Delete
    suspend fun deleteContact(contact: FavoriteContactEntity)
}
