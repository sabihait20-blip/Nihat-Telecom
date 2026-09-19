package com.example.nihattelecom.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.nihattelecom.data.model.TaliKhataRecord
import kotlinx.coroutines.flow.Flow

@Dao
interface TaliKhataDao {
    @Query("SELECT * FROM talikhata_records ORDER BY id DESC")
    fun getAllRecords(): Flow<List<TaliKhataRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: TaliKhataRecord): Long

    @Query("DELETE FROM talikhata_records WHERE id = :id")
    suspend fun deleteRecord(id: Long)
}
