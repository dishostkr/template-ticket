import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, ChannelType, EmbedBuilder, AttachmentBuilder, TextChannel } from 'discord.js';
import { ticketSystem } from '../utils/ticketSystem';
import fs from 'fs';
import path from 'path';

// 명령어 정의
export const data = new SlashCommandBuilder()
    .setName('ticket')
    .setNameLocalization('ko', '티켓')
    .setDescription('Ticket management commands.')
    .setDescriptionLocalization('ko', '티켓 관리 명령어')
    .addSubcommand(subcommand =>
        subcommand
            .setName('close')
            .setNameLocalization('ko', '닫기')
            .setDescription('Close the current ticket.')
            .setDescriptionLocalization('ko', '현재 티켓을 닫습니다.')
    );

/**
 * ticket 명령어 실행
 */
export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ 
            content: '이 명령어는 서버에서만 사용할 수 있습니다.', 
            ephemeral: true 
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'close') {
        await handleClose(interaction);
    }
}

async function handleClose(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) {
        await interaction.reply({ 
            content: '이 명령어는 서버의 티켓 채널에서만 사용할 수 있습니다.', 
            ephemeral: true 
        });
        return;
    }

    // 현재 채널이 티켓인지 확인
    const ticket = ticketSystem.getTicketByChannel(interaction.guild.id, interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({ 
            content: '이 채널은 티켓 채널이 아닙니다.', 
            ephemeral: true 
        });
        return;
    }

    await closeTicket(interaction);
}

export async function closeTicket(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) return;

    const setup = ticketSystem.getSetup(interaction.guild.id);
    if (!setup) {
        await interaction.reply({ 
            content: '티켓 시스템이 설정되지 않았습니다.', 
            ephemeral: true 
        });
        return;
    }

    await interaction.reply('⏳ 5초 뒤 티켓이 종료됩니다...');

    // 로그 채널 가져오기
    const logChannel = await interaction.guild.channels.fetch(setup.logChannel);
    
    if (logChannel && logChannel.type === ChannelType.GuildText) {
        try {
            // 채널 메시지 가져오기
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            // 메시지를 시간순으로 정렬
            const sortedMessages = Array.from(messages.values()).reverse();
            
            // 채널 이름 가져오기
            const channelName = interaction.channel.type === ChannelType.GuildText 
                ? (interaction.channel as TextChannel).name 
                : 'Unknown';
            
            // 로그 텍스트 생성
            let logText = `티켓 채널: ${channelName}\n`;
            logText += `종료 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
            logText += `=`.repeat(50) + '\n\n';
            
            for (const message of sortedMessages) {
                const timestamp = message.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                const author = message.author.tag;
                const content = message.content || '[임베드 또는 첨부 파일]';
                
                logText += `[${timestamp}] ${author}: ${content}\n`;
                
                // 첨부 파일이 있는 경우
                if (message.attachments.size > 0) {
                    message.attachments.forEach(attachment => {
                        logText += `  └ 첨부: ${attachment.url}\n`;
                    });
                }
            }
            
            // 임시 파일로 저장
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            const fileName = `ticket-log-${interaction.channel.id}.txt`;
            const filePath = path.join(tmpDir, fileName);
            fs.writeFileSync(filePath, logText, 'utf-8');
            
            // 로그 채널에 전송
            const logEmbed = new EmbedBuilder()
                .setTitle('📋 티켓 종료')
                .setDescription(`티켓 **${channelName}**이(가) 종료되었습니다.`)
                .addFields(
                    { name: '종료자', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '종료 시간', value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), inline: true }
                )
                .setColor(0xFF0000)
                .setTimestamp();
            
            const attachment = new AttachmentBuilder(filePath);
            
            await logChannel.send({
                embeds: [logEmbed],
                files: [attachment]
            });
            
            // 임시 파일 삭제
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error saving ticket log:', error);
        }
    }

    // 5초 대기
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 티켓 닫기
    ticketSystem.closeTicket(interaction.guild.id, interaction.channel.id);

    // 채널 삭제
    if (interaction.channel.type === ChannelType.GuildText) {
        await interaction.channel.delete('티켓 종료');
    }
}
