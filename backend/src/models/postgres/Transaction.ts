import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, IsUUID, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'transactions',
  timestamps: true,
})
export class Transaction extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  userId!: string;

  @Column({
    type: DataType.BIGINT, // Amount in paise
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'INR',
  })
  currency!: string;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: string;

  @Column(DataType.STRING)
  razorpayOrderId!: string;

  @Column(DataType.STRING)
  razorpayPaymentId!: string;

  @Column(DataType.TEXT)
  description!: string;

  @Column(DataType.JSONB)
  metadata!: any;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default Transaction;