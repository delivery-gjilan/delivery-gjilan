import { gql } from '@apollo/client';

export const GET_MY_REFERRAL_STATS = gql`
    query GetMyReferralStats {
        myReferralStats {
            totalReferrals
            completedReferrals
            pendingReferrals
            totalRewardsEarned
            referralCode
            referrals {
                id
                status
                rewardGiven
                rewardAmount
                completedAt
                createdAt
                referredUser {
                    firstName
                    lastName
                }
            }
        }
    }
`;

export const GENERATE_REFERRAL_CODE = gql`
    mutation GenerateReferralCode {
        generateReferralCode
    }
`;
